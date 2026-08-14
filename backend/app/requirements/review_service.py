import time
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.requirement import Requirement, RequirementVersion
from app.models.ai_job import AIJob
from app.models.enums import (
    AIJobStatus,
    RequirementReviewStatus,
    ReviewIssueType,
    ReviewSeverity,
    FindingEvidenceStatus,
    FindingHumanDecision,
    KnowledgeSourceType,
)
from app.models.requirement_review import RequirementReview, RequirementReviewFinding
from app.requirements.review_schemas import (
    ReviewOutputSchema,
    UpdateFindingDecisionRequest,
)
from app.requirements.review_repository import RequirementReviewRepository
from app.knowledge.service import KnowledgeService
from app.knowledge.schemas import KnowledgeSearchRequest
from app.ai.llm_provider import get_llm_provider
from app.ai.prompts import REQUIREMENT_REVIEW_PROMPT_V1
from app.permissions.dependencies import check_project_role_or_company_admin
from app.core.config import settings


class RequirementReviewService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RequirementReviewRepository(db)
        self.knowledge_service = KnowledgeService(db)
        self.llm_provider = get_llm_provider()

    def create_and_execute_review(
        self,
        project_id: UUID,
        requirement_id: UUID,
        current_user: User,
    ) -> RequirementReview:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        # Fetch Requirement
        req = self.db.execute(
            select(Requirement)
            .options(joinedload(Requirement.versions))
            .filter(
                Requirement.company_id == company_id,
                Requirement.project_id == project_id,
                Requirement.id == requirement_id,
            )
        ).unique().scalar_one_or_none()

        if not req:
            raise ValueError("Requirement not found.")

        # Get active version
        active_version = None
        if req.versions:
            sorted_versions = sorted(req.versions, key=lambda v: v.version_number, reverse=True)
            active_version = sorted_versions[0]

        if not active_version:
            # Create a default version if missing
            active_version = RequirementVersion(
                requirement_id=req.id,
                version_number=req.current_version or 1,
                title=req.title,
                description=req.description,
                requirement_type=req.requirement_type,
                priority=req.priority,
                status=req.status,
                source=req.source,
                acceptance_criteria=req.acceptance_criteria,
                change_summary="Initial requirement version",
                created_by=current_user.id,
            )
            self.db.add(active_version)
            self.db.commit()
            self.db.refresh(active_version)

        # Dynamic LLM Provider selection at runtime
        active_llm_provider = get_llm_provider()

        # 1. Create AIJob entity
        ai_job = AIJob(
            project_id=project_id,
            type="REQUIREMENT_REVIEW",
            status=AIJobStatus.QUEUED,
            created_by=current_user.id,
        )
        self.db.add(ai_job)
        self.db.commit()
        self.db.refresh(ai_job)

        # 2. Create RequirementReview entity
        review = RequirementReview(
            requirement_id=req.id,
            requirement_version_id=active_version.id,
            project_id=project_id,
            company_id=company_id,
            ai_job_id=ai_job.id,
            status=RequirementReviewStatus.QUEUED,
            model_name=active_llm_provider.get_model_name(),
            prompt_version="REQUIREMENT_REVIEW_PROMPT_V1",
            retrieval_top_k=5,
        )
        review = self.repo.create_review(company_id, project_id, review)

        # Execute review pipeline under status abstraction
        ai_job.status = AIJobStatus.RUNNING
        review.status = RequirementReviewStatus.RUNNING
        self.repo.update_review(company_id, project_id, review)

        start_total_time = time.time()

        try:
            # 3. Multi-Query RAG Retrieval
            start_retrieval_time = time.time()
            queries = [
                f"{req.title} {req.description or ''}",
            ]
            if req.acceptance_criteria:
                queries.append(req.acceptance_criteria)
            queries.append(f"{req.requirement_key} {req.requirement_type.value}")

            retrieved_chunks_map = {}
            for q in queries:
                s_res = self.knowledge_service.search_knowledge(
                    project_id=project_id,
                    request=KnowledgeSearchRequest(query=q, top_k=5),
                    current_user=current_user,
                )
                for item in s_res.results:
                    retrieved_chunks_map[str(item.chunk_id)] = item

            retrieval_latency = round((time.time() - start_retrieval_time) * 1000.0, 2)
            retrieved_items = list(retrieved_chunks_map.values())

            # 4. Authoritative Source Reference Set
            authoritative_source_set = set()
            context_blocks = []
            retrieved_chunk_ids = []
            similarity_scores = []

            for item in retrieved_items:
                retrieved_chunk_ids.append(str(item.chunk_id))
                similarity_scores.append(item.similarity_score)

                if item.source_key:
                    authoritative_source_set.add(item.source_key)
                authoritative_source_set.add(item.title)
                authoritative_source_set.add(item.source_type.value)

                version_str = f" | VERSION: {item.source_version}" if item.source_version else ""
                key_str = f" | {item.source_key}" if item.source_key else ""
                header = f"[SOURCE: {item.source_type.value}{key_str}{version_str}]"
                context_blocks.append(f"{header}\n{item.content}")

            formatted_context = "\n\n".join(context_blocks)

            # 5. Construct LLM Prompt
            user_prompt = f"""
TARGET REQUIREMENT TO REVIEW:
- Requirement Key: {req.requirement_key} (Version {active_version.version_number})
- Title: {req.title}
- Type: {req.requirement_type.value}
- Priority: {req.priority.value}
- Status: {req.status.value}
- Description: {req.description or 'N/A'}
- Acceptance Criteria: {req.acceptance_criteria or 'N/A'}

RETRIEVED PROJECT KNOWLEDGE CONTEXT:
{formatted_context if formatted_context else 'No prior project context retrieved.'}

Please perform a structured audit of this requirement version.
Return structured JSON output with findings according to the required schema.
"""

            # 6. Call BaseLLMProvider.generate_structured()
            start_gen_time = time.time()
            validated_output, raw_json_dict = active_llm_provider.generate_structured(
                prompt=user_prompt,
                system_instruction=REQUIREMENT_REVIEW_PROMPT_V1,
                response_schema=ReviewOutputSchema,
            )
            gen_latency = round((time.time() - start_gen_time) * 1000.0, 2)
            total_latency = round((time.time() - start_total_time) * 1000.0, 2)

            # Safe Runtime Diagnostics
            import logging
            logger = logging.getLogger(__name__)
            logger.info(
                "Requirement review diagnostics: provider=%s, model=%s, is_mock=%s, retrieved_chunk_count=%d, retrieved_source_keys=%s, context_character_count=%d, generation_latency_ms=%.2f",
                active_llm_provider.__class__.__name__,
                active_llm_provider.get_model_name(),
                active_llm_provider.__class__.__name__ == "MockLLMProvider",
                len(retrieved_items),
                list(authoritative_source_set),
                len(formatted_context),
                gen_latency,
            )

            # Store raw output internally in DB ONLY (excluded from API responses)
            review.raw_output_json = raw_json_dict
            review.retrieved_chunk_ids = retrieved_chunk_ids
            review.similarity_scores = similarity_scores
            review.retrieval_latency_ms = retrieval_latency
            review.generation_latency_ms = gen_latency
            review.total_latency_ms = total_latency

            # 7. Process & Verify Findings against Authoritative Source Set
            db_findings = []
            for item in validated_output.findings:
                # Verify source references
                verified_refs = []
                for ref in item.source_references:
                    ref_str = str(ref).strip()
                    if (
                        ref_str in authoritative_source_set
                        or any(ref_str in auth for auth in authoritative_source_set)
                        or any(auth in ref_str for auth in authoritative_source_set)
                    ):
                        verified_refs.append(ref_str)

                # Compute evidence_status & enforce non-fabrication
                if len(verified_refs) >= 1:
                    evidence_status = FindingEvidenceStatus.GROUNDED
                    evidence_text = item.evidence
                else:
                    evidence_status = FindingEvidenceStatus.INSUFFICIENT_CONTEXT
                    verified_refs = []
                    evidence_text = "Supporting project context was unavailable for this finding."

                finding_obj = RequirementReviewFinding(
                    review_id=review.id,
                    severity=item.severity,
                    issue_type=item.issue_type,
                    evidence_status=evidence_status,
                    title=item.title,
                    description=item.description,
                    evidence=evidence_text,
                    recommendation=item.recommendation,
                    source_references=verified_refs,
                    human_decision=FindingHumanDecision.PENDING,
                )
                db_findings.append(finding_obj)

            self.repo.create_findings(company_id, project_id, db_findings)

            review.status = RequirementReviewStatus.COMPLETED
            review.completed_at = datetime.now(timezone.utc)
            ai_job.status = AIJobStatus.COMPLETED
            ai_job.finished_at = datetime.now(timezone.utc)

            self.repo.update_review(company_id, project_id, review)
            self.db.commit()

            return self.repo.get_review_by_id(company_id, project_id, review.id)

        except Exception as err:
            review.status = RequirementReviewStatus.FAILED
            review.error_message = "Requirement review processing failed during AI execution."
            review.completed_at = datetime.now(timezone.utc)
            ai_job.status = AIJobStatus.FAILED
            ai_job.error_message = str(err)
            ai_job.finished_at = datetime.now(timezone.utc)

            self.repo.update_review(company_id, project_id, review)
            self.db.commit()
            return review

    def get_requirement_reviews(
        self,
        project_id: UUID,
        requirement_id: UUID,
        current_user: User,
    ) -> list[RequirementReview]:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        return self.repo.list_reviews_for_requirement(project.company_id, project_id, requirement_id)

    def get_review_detail(
        self,
        project_id: UUID,
        requirement_id: UUID,
        review_id: UUID,
        current_user: User,
    ) -> RequirementReview:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        review = self.repo.get_review_by_id(project.company_id, project_id, review_id)
        if not review:
            raise ValueError("Requirement review not found.")
        return review

    def update_finding_decision(
        self,
        project_id: UUID,
        requirement_id: UUID,
        review_id: UUID,
        finding_id: UUID,
        request: UpdateFindingDecisionRequest,
        current_user: User,
    ) -> RequirementReviewFinding:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        finding = self.repo.update_finding_decision(
            company_id=project.company_id,
            project_id=project_id,
            finding_id=finding_id,
            decision=request.human_decision,
            user_id=current_user.id,
            comment=request.human_comment,
            modified_recommendation=request.modified_recommendation,
        )
        if not finding:
            raise ValueError("Finding not found.")
        return finding
