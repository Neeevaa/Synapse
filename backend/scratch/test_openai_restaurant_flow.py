import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure backend path is in sys.path
sys.path.insert(0, r"c:\Projects\synapse\project\synapse\backend")

from dotenv import load_dotenv
load_dotenv(dotenv_path=r"c:\Projects\synapse\project\synapse\backend\.env")

# Set LLM_PROVIDER to openai
os.environ["LLM_PROVIDER"] = "openai"

from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement, RequirementVersion
from app.models.meeting import Meeting
from app.models.task import Task
from app.models.enums import CompanyRole, ProjectRole, RequirementType, MeetingType, FindingEvidenceStatus
from app.requirements.review_service import RequirementReviewService
from app.knowledge.service import KnowledgeService
from app.ai.llm_provider import get_llm_provider, OpenAILLMProvider
from app.requirements.review_schemas import ReviewOutputSchema, FindingOutputItem
from app.models.enums import ReviewSeverity, ReviewIssueType


def test_restaurant_review():
    print("=" * 60)
    print("OPENAI RESTAURANT REQUIREMENT REVIEW E2E FLOW")
    print("=" * 60)

    db = SessionLocal()
    try:
        co_slug = f"bistro-co-{uuid.uuid4().hex[:6]}"
        co = Company(name="Bistro Operations Co", slug=co_slug)
        db.add(co)
        db.commit()

        user = User(
            company_id=co.id,
            email=f"bistro_mgr_{uuid.uuid4().hex[:6]}@bistro.com",
            first_name="Restaurant",
            last_name="Manager",
            role=CompanyRole.ADMIN,
            is_active=True,
            password_hash="mockhash",
        )
        db.add(user)
        db.commit()

        proj = Project(company_id=co.id, name="Bistro Order Management", created_by=user.id)
        db.add(proj)
        db.commit()

        pm = ProjectMember(project_id=proj.id, user_id=user.id, role=ProjectRole.PROJECT_MANAGER)
        db.add(pm)
        db.commit()

        # Requirement
        req = Requirement(
            project_id=proj.id,
            company_id=co.id,
            requirement_key="REQ-POS-101",
            title="Order Cancellation Rule Specification",
            description="The system shall allow restaurant managers to cancel an order at any time.",
            acceptance_criteria="Managers can trigger order cancellation from POS terminal interface.",
            created_by=user.id,
        )
        db.add(req)
        db.commit()

        req_ver = RequirementVersion(
            requirement_id=req.id,
            version_number=1,
            title=req.title,
            description=req.description,
            requirement_type=req.requirement_type,
            priority=req.priority,
            status=req.status,
            source=req.source,
            acceptance_criteria=req.acceptance_criteria,
            change_summary="Initial requirement spec",
            created_by=user.id,
        )
        db.add(req_ver)
        db.commit()

        # Meeting
        mtg = Meeting(
            project_id=proj.id,
            company_id=co.id,
            title="Order Workflow Operations Sync",
            meeting_type=MeetingType.TECHNICAL,
            organizer_id=user.id,
            scheduled_at=datetime.now(timezone.utc),
            duration_minutes=30,
            summary="Customers can cancel before kitchen preparation. After preparation begins, manager approval is required.",
        )
        db.add(mtg)
        db.commit()

        # Task
        task = Task(
            project_id=proj.id,
            title="Implement Order Cancellation Rules",
            description="Implement order cancellation rules so cancellation is allowed before preparation and requires manager approval after preparation.",
            created_by=user.id,
        )
        db.add(task)
        db.commit()

        # Index Knowledge Base
        k_service = KnowledgeService(db)
        k_service.index_project_artifacts(proj.id, user)

        # Mock OpenAI API structured response boundary to return restaurant finding
        restaurant_finding = FindingOutputItem(
            severity=ReviewSeverity.HIGH,
            issue_type=ReviewIssueType.INCONSISTENCY,
            title="Unrestricted Order Cancellation Contradicts Kitchen Prep Approval Policy",
            description="Requirement specifies that managers can cancel an order 'at any time', but the technical meeting sync and implementation task require explicit manager approval after kitchen preparation begins.",
            evidence="Meeting notes from Order Workflow Operations Sync state: 'Customers can cancel before kitchen preparation. After preparation begins, manager approval is required.'",
            recommendation="Update requirement text to explicitly state that order cancellation requires kitchen manager PIN approval if preparation has already started.",
            source_references=["MTG-Order Workflow Operations Sync"]
        )
        mock_output_schema = ReviewOutputSchema(findings=[restaurant_finding])
        mock_raw_json = {
            "findings": [restaurant_finding.model_dump()]
        }

        # Inject real provider structured generation mock
        provider = get_llm_provider()
        assert isinstance(provider, OpenAILLMProvider), "Expected OpenAILLMProvider!"

        # Temporarily monkeypatch generate_structured for end-to-end verification
        provider.generate_structured = lambda prompt, system_instruction, response_schema: (mock_output_schema, mock_raw_json)

        review_service = RequirementReviewService(db)
        review_service.llm_provider = provider

        review = review_service.create_and_execute_review(proj.id, req.id, user)

        print(f"Review ID: {review.id}")
        print(f"Status: {review.status.value}")
        print(f"Model Name: {review.model_name}")
        print(f"Findings Count: {len(review.findings)}")

        sample_oauth_present = False
        sample_websocket_present = False

        for idx, f in enumerate(review.findings, 1):
            print(f"\n--- Finding {idx} ---")
            print(f"Title: {f.title}")
            print(f"Severity: {f.severity.value}")
            print(f"Issue Type: {f.issue_type.value}")
            print(f"Evidence Status: {f.evidence_status.value}")
            print(f"Evidence: {f.evidence}")
            print(f"Recommendation: {f.recommendation}")
            print(f"Verified Sources: {f.source_references}")

            if "oauth2" in f.title.lower() or "oauth2" in f.description.lower():
                sample_oauth_present = True
            if "websocket" in f.title.lower() or "websocket" in f.description.lower():
                sample_websocket_present = True

        assert not sample_oauth_present, "OAuth2 sample finding detected!"
        assert not sample_websocket_present, "WebSocket sample finding detected!"
        assert review.findings[0].evidence_status == FindingEvidenceStatus.GROUNDED
        assert "MTG-Order Workflow Operations Sync" in review.findings[0].source_references

        print("\n" + "=" * 60)
        print("RESTAURANT REVIEW FLOW VERIFIED SUCCESSFULLY!")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    test_restaurant_review()
