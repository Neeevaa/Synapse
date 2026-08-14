import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure backend path is in sys.path
sys.path.insert(0, r"c:\Projects\synapse\project\synapse\backend")

from dotenv import load_dotenv
load_dotenv(dotenv_path=r"c:\Projects\synapse\project\synapse\backend\.env")

# Set LLM_PROVIDER to gemini
os.environ["LLM_PROVIDER"] = "gemini"

from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement, RequirementVersion
from app.models.meeting import Meeting
from app.models.task import Task
from app.models.enums import CompanyRole, ProjectRole, RequirementType, MeetingType
from app.requirements.review_service import RequirementReviewService
from app.knowledge.service import KnowledgeService
from app.ai.llm_provider import get_llm_provider, GeminiLLMProvider


def run_diagnostic():
    print("=" * 60)
    print("STEP 2 — VERIFY SETTINGS & ACTIVE PROVIDER")
    print("=" * 60)

    llm_prov_env = os.getenv("LLM_PROVIDER", "")
    gemini_key_env = os.getenv("GEMINI_API_KEY", "")
    embed_prov_env = os.getenv("EMBEDDING_PROVIDER", "")
    embed_dim_env = os.getenv("EMBEDDING_DIMENSION", "")

    print(f"LLM_PROVIDER={llm_prov_env}")
    print(f"GEMINI_API_KEY_CONFIGURED={'true' if bool(gemini_key_env) else 'false'}")
    print(f"EMBEDDING_PROVIDER={embed_prov_env}")
    print(f"EMBEDDING_DIMENSION={embed_dim_env}")

    provider_instance = get_llm_provider()
    print(f"Active Provider Instance Class: {provider_instance.__class__.__name__}")
    print(f"Active Provider Model Name: {provider_instance.get_model_name()}")
    assert isinstance(provider_instance, GeminiLLMProvider), "Expected GeminiLLMProvider!"

    db = SessionLocal()
    try:
        # Create dedicated Restaurant company & project for test
        co_slug = f"restaurant-co-{uuid.uuid4().hex[:6]}"
        co = Company(name="Restaurant Co", slug=co_slug)
        db.add(co)
        db.commit()

        user = User(
            company_id=co.id,
            email=f"manager_{uuid.uuid4().hex[:6]}@bistro.com",
            first_name="Restaurant",
            last_name="Manager",
            role=CompanyRole.ADMIN,
            is_active=True,
            password_hash="mockhash",
        )
        db.add(user)
        db.commit()

        proj = Project(company_id=co.id, name="Bistro POS System", created_by=user.id)
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
            summary="Customers can cancel before kitchen preparation. After preparation starts, manager approval is required.",
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

        # Index Knowledge Base for the project
        k_service = KnowledgeService(db)
        k_service.index_project_artifacts(proj.id, user)

        print("\n" + "=" * 60)
        print("STEP 9 — EXECUTING REAL GEMINI LLM REQUIREMENT REVIEW")
        print("=" * 60)

        review_service = RequirementReviewService(db)
        review = review_service.create_and_execute_review(proj.id, req.id, user)

        print(f"Review ID: {review.id}")
        print(f"Review Status: {review.status.value}")
        print(f"Model Used: {review.model_name}")
        print(f"Retrieval Latency: {review.retrieval_latency_ms} ms")
        print(f"Generation Latency: {review.generation_latency_ms} ms")
        print(f"Total Latency: {review.total_latency_ms} ms")
        print(f"Total Findings Count: {len(review.findings)}")

        # Verification Checks
        assert review.model_name == "gemini-1.5-flash", f"Unexpected model name: {review.model_name}"

        sample_oauth_present = False
        sample_websocket_present = False

        print("\n" + "=" * 60)
        print("FINDINGS SUMMARY")
        print("=" * 60)
        for idx, f in enumerate(review.findings, 1):
            print(f"\n--- Finding {idx} ---")
            print(f"Title: {f.title}")
            print(f"Severity: {f.severity.value}")
            print(f"Issue Type: {f.issue_type.value}")
            print(f"Evidence Status: {f.evidence_status.value}")
            print(f"Evidence: {f.evidence}")
            print(f"Recommendation: {f.recommendation}")
            print(f"Verified Source References: {f.source_references}")

            if "oauth2" in f.title.lower() or "oauth2" in f.description.lower():
                sample_oauth_present = True
            if "websocket" in f.title.lower() or "websocket" in f.description.lower():
                sample_websocket_present = True

        assert not sample_oauth_present, "ERR: Sample OAuth2 finding returned!"
        assert not sample_websocket_present, "ERR: Sample WebSocket finding returned!"

        print("\n" + "=" * 60)
        print("DIAGNOSTIC SUCCESSFUL — REAL GEMINI API VERIFIED!")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    run_diagnostic()
