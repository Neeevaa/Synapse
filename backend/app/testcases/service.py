import time
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import Session


from app.models.user import User
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.models.ai_job import AIJob

from app.models.enums import (
    AIJobStatus,
    TestCaseCategory,
    TestCaseStatus,
    TestCasePriority,
    TestCaseSource,
)
from app.testcases.repository import TestCaseRepository
from app.testcases.schemas import (
    GeneratedTestCaseItem,
    TestCaseGenerationOutputSchema,
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseResponse,
    TestCaseListResponse,
)
from app.knowledge.service import KnowledgeService
from app.knowledge.schemas import KnowledgeSearchRequest
from app.subscriptions.service import EntitlementService
from app.subscriptions.entitlements import FEATURE_AI_TEST_CASES
from app.ai.llm_provider import get_llm_provider
from app.ai.prompts import AI_TEST_CASE_GENERATOR_PROMPT_V1
from app.permissions.dependencies import check_project_role_or_company_admin
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException

logger = logging.getLogger("app.testcases")


class TestCaseService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TestCaseRepository(db)
        self.knowledge_service = KnowledgeService(db)
        self.entitlement_service = EntitlementService(db)

    def _serialize_test_case(self, tc: TestCase) -> TestCaseResponse:
        creator_name = None
        if tc.creator:
            creator_name = getattr(tc.creator, "full_name", None) or getattr(tc.creator, "email", None)

        approver_name = None
        if tc.approver:
            approver_name = getattr(tc.approver, "full_name", None) or getattr(tc.approver, "email", None)

        return TestCaseResponse(
            id=tc.id,
            company_id=tc.company_id,
            project_id=tc.project_id,
            requirement_id=tc.requirement_id,
            title=tc.title,
            description=tc.description,
            category=tc.category,
            priority=tc.priority,
            status=tc.status,
            source=tc.source,
            preconditions=tc.preconditions,
            test_steps=tc.test_steps or [],
            expected_result=tc.expected_result,
            test_data=tc.test_data,
            generation_metadata=tc.generation_metadata,
            created_by=tc.created_by,
            creator_name=creator_name,
            approved_by=tc.approved_by,
            approver_name=approver_name,
            approved_at=tc.approved_at,
            created_at=tc.created_at,
            updated_at=tc.updated_at,
        )

    def generate_test_cases(
        self,
        project_id: UUID,
        requirement_id: UUID,
        current_user: User,
    ) -> List[TestCaseResponse]:
        # 1. Project access & tenant isolation check
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        # 2. Verify requirement exists and belongs to this tenant project
        req = self.db.execute(
            select(Requirement).filter(
                Requirement.id == requirement_id,
                Requirement.project_id == project_id,
                Requirement.company_id == company_id,
            )
        ).scalar_one_or_none()

        if not req:
            raise ResourceNotFound("Requirement not found.")

        if not req.title or not req.title.strip():
            raise BaseBusinessException("Requirement title cannot be empty for test case generation.", status_code=400)

        # 3. Check Subscription Entitlement
        effective_entitlements = self.entitlement_service.get_effective_entitlements(company_id)
        if FEATURE_AI_TEST_CASES not in effective_entitlements.enabled_features:
            raise BaseBusinessException(
                "AI Test Case Generator is not available on your current plan.",
                status_code=403,
            )

        # 4. Check AI execution quota allowance
        if effective_entitlements.max_ai_executions != -1:
            ai_executions_used = self.db.scalar(
                select(func.count(AIJob.id)).filter(
                    AIJob.project_id.in_(
                        select(Project.id).filter(Project.company_id == company_id)
                    )
                )
            ) or 0
            if ai_executions_used >= effective_entitlements.max_ai_executions:
                raise BaseBusinessException(
                    "Your organization's AI usage limit has been reached.",
                    status_code=403,
                )

        # 5. Create AIJob entity to track execution and enforce quota
        ai_job = AIJob(
            project_id=project_id,
            type="TEST_CASE_GENERATION",
            status=AIJobStatus.QUEUED,
            created_by=current_user.id,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(ai_job)
        self.db.commit()
        self.db.refresh(ai_job)

        ai_job.status = AIJobStatus.RUNNING
        self.db.commit()

        start_time = time.time()
        retrieved_items = []

        try:
            # 6. Retrieve relevant project knowledge context (RAG)
            queries = [
                f"{req.title} {req.description or ''}",
            ]
            if req.acceptance_criteria:
                queries.append(req.acceptance_criteria)
            queries.append(f"{req.requirement_key} {req.requirement_type.value}")

            retrieved_chunks_map = {}
            for q in queries:
                try:
                    s_res = self.knowledge_service.search_knowledge(
                        project_id=project_id,
                        request=KnowledgeSearchRequest(query=q, top_k=3),
                        current_user=current_user,
                    )
                    for item in s_res.results:
                        retrieved_chunks_map[str(item.chunk_id)] = item
                except Exception as ex:
                    logger.warning(f"RAG search error during test case generation: {ex}")

            retrieved_items = list(retrieved_chunks_map.values())
            context_blocks = []
            for item in retrieved_items:
                header = f"[SOURCE: {item.source_type.value} | {item.title}]"
                context_blocks.append(f"{header}\n{item.content}")

            formatted_context = "\n\n".join(context_blocks) if context_blocks else "No additional project context found."

            # 7. Construct LLM user prompt
            user_prompt = f"""
TARGET REQUIREMENT FOR TEST GENERATION:
- Requirement Key: {req.requirement_key}
- Title: {req.title}
- Type: {req.requirement_type.value}
- Priority: {req.priority.value}
- Status: {req.status.value}
- Description: {req.description or 'N/A'}
- Acceptance Criteria: {req.acceptance_criteria or 'N/A'}

RELEVANT PROJECT KNOWLEDGE CONTEXT:
{formatted_context}

Please generate comprehensive, non-redundant test cases covering:
1. FUNCTIONAL (normal expected workflows)
2. NEGATIVE (invalid inputs, unauthorized access, missing required fields, error conditions)
3. BOUNDARY (limits, thresholds, minimum/maximum lengths, edge conditions)
4. ACCEPTANCE (directly verifying the acceptance criteria and stakeholder rules)

Ensure output adheres strictly to the required JSON schema.
"""

            # 8. Call LLM provider with structured output validation
            active_llm_provider = get_llm_provider()
            validated_output, raw_dict = active_llm_provider.generate_structured(
                prompt=user_prompt,
                system_instruction=AI_TEST_CASE_GENERATOR_PROMPT_V1,
                response_schema=TestCaseGenerationOutputSchema,
            )

            if not validated_output.test_cases:
                raise ValueError("AI generator returned an empty list of test cases.")

            # 9. Deduplicate and construct DB test case entities as DRAFT
            saved_entities = []
            seen_titles = set()

            for item in validated_output.test_cases:
                normalized_title = item.title.strip().lower()
                if normalized_title in seen_titles:
                    continue
                seen_titles.add(normalized_title)

                steps_payload = [s.model_dump() for s in item.steps] if item.steps else []

                tc = TestCase(
                    company_id=company_id,
                    project_id=project_id,
                    requirement_id=requirement_id,
                    title=item.title.strip(),
                    description=item.description.strip(),
                    category=item.category,
                    priority=item.priority,
                    status=TestCaseStatus.DRAFT,
                    source=TestCaseSource.AI_GENERATED,
                    preconditions=item.preconditions.strip() if item.preconditions else None,
                    test_steps=steps_payload,
                    expected_result=item.expected_result.strip(),
                    test_data=item.test_data.strip() if item.test_data else None,
                    generation_metadata={
                        "ai_job_id": str(ai_job.id),
                        "model_name": active_llm_provider.get_model_name(),
                        "generation_latency_ms": round((time.time() - start_time) * 1000.0, 2),
                        "rag_chunks_used": len(retrieved_items),
                    },
                    created_by=current_user.id,
                )
                self.db.add(tc)
                saved_entities.append(tc)

            self.db.commit()

            # Refresh all newly created entities
            for tc in saved_entities:
                self.db.refresh(tc)

            # Update AIJob status to COMPLETED
            ai_job.status = AIJobStatus.COMPLETED
            ai_job.finished_at = datetime.now(timezone.utc)
            ai_job.result_metadata = {
                "generated_count": len(saved_entities),
                "model_name": active_llm_provider.get_model_name(),
            }
            self.db.commit()

            return [self._serialize_test_case(tc) for tc in saved_entities]

        except Exception as e:
            self.db.rollback()
            ai_job.status = AIJobStatus.FAILED
            ai_job.finished_at = datetime.now(timezone.utc)
            ai_job.error_message = str(e)
            try:
                self.db.commit()
            except Exception:
                pass

            logger.exception(f"Test case generation failed for requirement {requirement_id}: {e}")
            if isinstance(e, BaseBusinessException):
                raise e
            raise BaseBusinessException(
                "AI test case generation encountered an unexpected error. Please try again.",
                status_code=500,
            )

    def list_test_cases(
        self,
        project_id: UUID,
        requirement_id: UUID,
        current_user: User,
        category: Optional[TestCaseCategory] = None,
        status: Optional[TestCaseStatus] = None,
    ) -> TestCaseListResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        # Verify requirement exists
        req = self.db.execute(
            select(Requirement).filter(
                Requirement.id == requirement_id,
                Requirement.project_id == project_id,
                Requirement.company_id == company_id,
            )
        ).scalar_one_or_none()
        if not req:
            raise ResourceNotFound("Requirement not found.")

        items = self.repo.list_by_requirement(
            requirement_id=requirement_id,
            project_id=project_id,
            company_id=company_id,
            category=category,
            status=status,
        )

        counts_status = self.repo.get_counts_by_status(requirement_id, project_id, company_id)
        counts_category = self.repo.get_counts_by_category(requirement_id, project_id, company_id)

        serialized_items = [self._serialize_test_case(tc) for tc in items]

        return TestCaseListResponse(
            items=serialized_items,
            total=len(serialized_items),
            counts_by_status=counts_status,
            counts_by_category=counts_category,
        )

    def get_test_case(
        self,
        project_id: UUID,
        test_case_id: UUID,
        current_user: User,
    ) -> TestCaseResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        tc = self.repo.get_by_id(test_case_id, project_id=project_id, company_id=company_id)
        if not tc:
            raise ResourceNotFound("Test case not found.")

        return self._serialize_test_case(tc)

    def update_test_case(
        self,
        project_id: UUID,
        test_case_id: UUID,
        data: TestCaseUpdate,
        current_user: User,
    ) -> TestCaseResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        tc = self.repo.get_by_id(test_case_id, project_id=project_id, company_id=company_id)
        if not tc:
            raise ResourceNotFound("Test case not found.")

        if data.title is not None:
            tc.title = data.title.strip()
        if data.description is not None:
            tc.description = data.description.strip()
        if data.category is not None:
            tc.category = data.category
        if data.priority is not None:
            tc.priority = data.priority
        if data.preconditions is not None:
            tc.preconditions = data.preconditions.strip() if data.preconditions else None
        if data.test_steps is not None:
            tc.test_steps = [s.model_dump() for s in data.test_steps]
        if data.expected_result is not None:
            tc.expected_result = data.expected_result.strip()
        if data.test_data is not None:
            tc.test_data = data.test_data.strip() if data.test_data else None

        # CRITICAL RULE: Editing must NOT automatically approve a test case.
        # Modified test cases remain DRAFT until explicitly approved.
        tc.status = TestCaseStatus.DRAFT
        tc.approved_by = None
        tc.approved_at = None

        updated_tc = self.repo.update(tc)
        return self._serialize_test_case(updated_tc)

    def approve_test_case(
        self,
        project_id: UUID,
        test_case_id: UUID,
        current_user: User,
    ) -> TestCaseResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        tc = self.repo.get_by_id(test_case_id, project_id=project_id, company_id=company_id)
        if not tc:
            raise ResourceNotFound("Test case not found.")

        tc.status = TestCaseStatus.APPROVED
        tc.approved_by = current_user.id
        tc.approved_at = datetime.now(timezone.utc)

        updated_tc = self.repo.update(tc)
        return self._serialize_test_case(updated_tc)

    def reject_test_case(
        self,
        project_id: UUID,
        test_case_id: UUID,
        current_user: User,
    ) -> TestCaseResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        tc = self.repo.get_by_id(test_case_id, project_id=project_id, company_id=company_id)
        if not tc:
            raise ResourceNotFound("Test case not found.")

        tc.status = TestCaseStatus.REJECTED
        tc.approved_by = None
        tc.approved_at = None

        updated_tc = self.repo.update(tc)
        return self._serialize_test_case(updated_tc)

    def delete_test_case(
        self,
        project_id: UUID,
        test_case_id: UUID,
        current_user: User,
    ) -> None:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        tc = self.repo.get_by_id(test_case_id, project_id=project_id, company_id=company_id)
        if not tc:
            raise ResourceNotFound("Test case not found.")

        self.repo.delete(tc)
