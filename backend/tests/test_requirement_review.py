import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement, RequirementVersion
from app.models.meeting import Meeting
from app.models.task import Task
from app.models.sprint import Sprint
from app.models.enums import (
    CompanyRole,
    ProjectRole,
    RequirementType,
    RequirementStatus,
    MeetingType,
    FindingHumanDecision,
    FindingEvidenceStatus,
    RequirementReviewStatus,
)
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_create_review_job_and_state_transitions(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Rev Co 1")
    pm = create_user(db_session, co, email="pm_rev1@rev.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Rev Proj 1")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-101",
        title="User Password Authentication",
        description="System shall allow users to authenticate using email and password.",
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    headers = get_auth_headers(pm.id)

    # Post Review request
    res = client.post(f"/projects/{proj.id}/requirements/{req.id}/reviews", headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()["data"]

    assert data["requirement_id"] == str(req.id)
    assert data["status"] == "COMPLETED"
    assert data["model_name"] == "mock-deterministic-v1"
    assert len(data["findings"]) >= 1


def test_raw_output_json_not_exposed_in_api_responses(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Rev Co 2")
    pm = create_user(db_session, co, email="pm_rev2@rev.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Rev Proj 2")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-102",
        title="Session Token Security",
        description="Tokens must be transmitted over TLS 1.3.",
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    res = client.post(f"/projects/{proj.id}/requirements/{req.id}/reviews", headers=headers)
    assert res.status_code == 201
    data = res.json()["data"]

    # Ensure raw_output_json is NOT present in API payload
    assert "raw_output_json" not in data


def test_human_decision_feedback_persistence(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Rev Co 3")
    pm = create_user(db_session, co, email="pm_rev3@rev.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Rev Proj 3")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-103",
        title="Role Based Access Control",
        description="PM and Team Lead roles have distinct authority boundaries.",
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    res_review = client.post(f"/projects/{proj.id}/requirements/{req.id}/reviews", headers=headers)
    assert res_review.status_code == 201
    review_id = res_review.json()["data"]["id"]
    finding_id = res_review.json()["data"]["findings"][0]["id"]

    # 1. Accept Finding
    patch_accept = {
        "human_decision": "ACCEPTED",
        "human_comment": "Approved finding during PM triage."
    }
    res_patch = client.patch(
        f"/projects/{proj.id}/requirements/{req.id}/reviews/{review_id}/findings/{finding_id}",
        json=patch_accept,
        headers=headers,
    )
    assert res_patch.status_code == 200, res_patch.text
    finding_data = res_patch.json()["data"]
    assert finding_data["human_decision"] == "ACCEPTED"
    assert finding_data["human_comment"] == "Approved finding during PM triage."

    # 2. Modify Finding
    patch_modify = {
        "human_decision": "MODIFIED",
        "human_comment": "Customized recommendation for sprint 14.",
        "modified_recommendation": "Update token rotation timeout to 15 mins."
    }
    res_mod = client.patch(
        f"/projects/{proj.id}/requirements/{req.id}/reviews/{review_id}/findings/{finding_id}",
        json=patch_modify,
        headers=headers,
    )
    assert res_mod.status_code == 200
    mod_data = res_mod.json()["data"]
    assert mod_data["human_decision"] == "MODIFIED"
    assert mod_data["recommendation"] == "Update token rotation timeout to 15 mins."


def test_cross_company_review_isolation(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company A Rev")
    co_b = create_company(db_session, name="Company B Rev")

    pm_a = create_user(db_session, co_a, email="pma_rev@coma.com", role=CompanyRole.ADMIN)
    pm_b = create_user(db_session, co_b, email="pmb_rev@comb.com", role=CompanyRole.ADMIN)

    proj_a = create_project(db_session, co_a, name="Project A Rev")
    proj_b = create_project(db_session, co_b, name="Project B Rev")

    pm_mem_a = ProjectMember(project_id=proj_a.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    pm_mem_b = ProjectMember(project_id=proj_b.id, user_id=pm_b.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add_all([pm_mem_a, pm_mem_b])
    db_session.commit()

    req_a = Requirement(
        project_id=proj_a.id,
        company_id=co_a.id,
        requirement_key="REQ-SECRET-REV",
        title="Secret Algorithm Spec",
        description="Company A confidential code.",
        created_by=pm_a.id,
    )
    db_session.add(req_a)
    db_session.commit()

    headers_a = get_auth_headers(pm_a.id)
    headers_b = get_auth_headers(pm_b.id)

    # Trigger review by PM A
    res_a = client.post(f"/projects/{proj_a.id}/requirements/{req_a.id}/reviews", headers=headers_a)
    assert res_a.status_code == 201
    review_id = res_a.json()["data"]["id"]

    # PM B attempts to view Company A's review -> 403 Forbidden
    res_cross = client.get(f"/projects/{proj_a.id}/requirements/{req_a.id}/reviews/{review_id}", headers=headers_b)
    assert res_cross.status_code == 403


def test_end_to_end_artifact_review_integration(client: TestClient, db_session: Session):
    co = create_company(db_session, name="E2E Rev Co")
    pm = create_user(db_session, co, email="pm_e2e_rev@co.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="E2E Rev Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    # 1. Create Requirement, Meeting, Task & Sprint
    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-501",
        title="Refresh Token Rotation Security Specification",
        description="Access tokens must expire in 15 minutes. Refresh tokens must rotate on usage.",
        acceptance_criteria="Token rotation enforced. Revocation list maintained in Redis.",
        created_by=pm.id,
    )
    mtg = Meeting(
        project_id=proj.id,
        company_id=co.id,
        title="Security Sync",
        meeting_type=MeetingType.TECHNICAL,
        organizer_id=pm.id,
        scheduled_at=datetime.now(timezone.utc),
        duration_minutes=30,
        summary="Security sync agreed on 15 minute token rotation.",
    )
    db_session.add_all([req, mtg])
    db_session.commit()

    headers = get_auth_headers(pm.id)

    # 2. Index Knowledge Base
    res_idx = client.post(f"/projects/{proj.id}/knowledge/index", headers=headers)
    assert res_idx.status_code == 200

    # 3. Trigger Requirement Review
    res_rev = client.post(f"/projects/{proj.id}/requirements/{req.id}/reviews", headers=headers)
    assert res_rev.status_code == 201, res_rev.text
    rev_data = res_rev.json()["data"]

    assert rev_data["status"] == "COMPLETED"
    assert len(rev_data["findings"]) >= 1

    first_finding = rev_data["findings"][0]
    assert "evidence_status" in first_finding
    assert first_finding["evidence_status"] in ["GROUNDED", "INSUFFICIENT_CONTEXT"]
    assert "recommendation" in first_finding


def test_gemini_provider_selection(monkeypatch):
    from app.ai.llm_provider import get_llm_provider, GeminiLLMProvider
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key")
    provider = get_llm_provider()
    assert isinstance(provider, GeminiLLMProvider)
    assert provider.get_model_name() == "gemini-2.5-flash"


def test_gemini_configuration_error_when_key_missing(monkeypatch):
    from app.ai.llm_provider import get_llm_provider, ConfigurationError
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    with pytest.raises(ConfigurationError):
        get_llm_provider()


def test_real_provider_response_schema_validation(monkeypatch):
    from app.ai.llm_provider import GeminiLLMProvider
    from app.requirements.review_schemas import ReviewOutputSchema

    monkeypatch.setenv("GEMINI_API_KEY", "mock_key")

    class MockContent:
        text = '```json\n{"findings": [{"severity": "CRITICAL", "issue_type": "CONFLICT", "title": "Order Cancellation Conflict", "description": "Conflict in kitchen status", "evidence": "Meeting note says manager approval needed", "recommendation": "Require manager pin", "source_references": ["MTG-1"]}]}\n```'

    class MockGenAIModel:
        def __init__(self, *args, **kwargs):
            pass
        def generate_content(self, prompt):
            return MockContent()

    import sys
    import types
    mock_genai = types.ModuleType("google.generativeai")
    mock_genai.configure = lambda api_key: None
    mock_genai.GenerativeModel = MockGenAIModel
    monkeypatch.setitem(sys.modules, "google.generativeai", mock_genai)

def test_openai_provider_selection(monkeypatch):
    from app.ai.llm_provider import get_llm_provider, OpenAILLMProvider
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test_openai_key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4o-mini")
    provider = get_llm_provider()
    assert isinstance(provider, OpenAILLMProvider)
    assert provider.get_model_name() == "gpt-4o-mini"


def test_openai_configuration_error_when_key_missing(monkeypatch):
    from app.ai.llm_provider import get_llm_provider, ConfigurationError
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    with pytest.raises(ConfigurationError):
        get_llm_provider()


def test_openai_provider_response_schema_validation(monkeypatch):
    from app.ai.llm_provider import OpenAILLMProvider
    from app.requirements.review_schemas import ReviewOutputSchema, FindingOutputItem
    from app.models.enums import ReviewSeverity, ReviewIssueType

    monkeypatch.setenv("OPENAI_API_KEY", "mock_key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4o-mini")

    finding = FindingOutputItem(
        severity=ReviewSeverity.HIGH,
        issue_type=ReviewIssueType.INCONSISTENCY,
        title="Restaurant Order Cancellation Contradiction",
        description="Requirement says cancel at any time, but policy requires manager approval after prep.",
        evidence="Meeting summary states manager approval required after preparation.",
        recommendation="Clarify manager authorization workflow.",
        source_references=["MTG-Order Workflow Operations Sync"]
    )
    mock_schema_obj = ReviewOutputSchema(findings=[finding])

    class MockChoiceMessage:
        parsed = mock_schema_obj
        content = '{"findings": [{"title": "Restaurant Order Cancellation Contradiction"}]}'

    class MockChoice:
        message = MockChoiceMessage()

    class MockCompletion:
        choices = [MockChoice()]

    class MockBetaCompletions:
        def parse(self, *args, **kwargs):
            return MockCompletion()

    class MockBeta:
        chat = type("MockChat", (), {"completions": MockBetaCompletions()})()

    class MockOpenAIClient:
        def __init__(self, api_key):
            self.beta = MockBeta()

    import sys
    import types
    mock_openai = types.ModuleType("openai")
    mock_openai.OpenAI = MockOpenAIClient
    mock_openai.NotFoundError = Exception
    mock_openai.AuthenticationError = Exception
    mock_openai.RateLimitError = Exception
    mock_openai.APIError = Exception
    monkeypatch.setitem(sys.modules, "openai", mock_openai)

    provider = OpenAILLMProvider()
    val_obj, raw_dict = provider.generate_structured("test prompt", "sys instruction", ReviewOutputSchema)
    assert len(val_obj.findings) == 1
    assert val_obj.findings[0].title == "Restaurant Order Cancellation Contradiction"



