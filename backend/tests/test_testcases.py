import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.models.test_case import TestCase
from app.models.ai_job import AIJob
from app.models.enums import (
    CompanyRole,
    ProjectRole,
    SubscriptionPlan,
    TestCaseCategory,
    TestCaseStatus,
    TestCasePriority,
    TestCaseSource,
    AIJobStatus,
)
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def setup_test_context(db_session: Session, plan=SubscriptionPlan.STARTER):
    company = create_company(db_session, name=f"Co-{uuid.uuid4().hex[:6]}")
    company.subscription_plan = plan
    db_session.commit()

    pm = create_user(db_session, company, email=f"pm_{uuid.uuid4().hex[:6]}@test.com", role=CompanyRole.ADMIN)
    project = create_project(db_session, company, name="Test Project")

    pm_member = ProjectMember(project_id=project.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    requirement = Requirement(
        project_id=project.id,
        company_id=company.id,
        requirement_key="REQ-001",
        title="User Authentication with Multifactor Support",
        description="System shall authenticate users using email, password, and TOTP code.",
        acceptance_criteria="1. Valid credentials and TOTP produce active session.\n2. Invalid code rejects.",
        created_by=pm.id,
    )
    db_session.add(requirement)
    db_session.commit()
    db_session.refresh(requirement)

    return company, pm, project, requirement


# 1. Authorized user can generate test cases.
def test_authorized_user_can_generate_test_cases(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert len(data) >= 4
    for tc in data:
        assert tc["requirement_id"] == str(req.id)
        assert tc["status"] == "DRAFT"
        assert tc["source"] == "AI_GENERATED"
        assert len(tc["test_steps"]) > 0


# 2. Unauthorized user cannot generate.
def test_unauthorized_user_cannot_generate(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)

    # Missing credentials
    res_no_auth = client.post(f"/projects/{project.id}/requirements/{req.id}/test-cases/generate")
    assert res_no_auth.status_code in (401, 403)

    # Unassociated user
    other_co = create_company(db_session, name="Other Co")
    unauth_user = create_user(db_session, other_co, email="outsider@test.com", role=None)
    res_forbidden = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=get_auth_headers(unauth_user.id),
    )
    assert res_forbidden.status_code == 403


# 3. Cross-tenant access is rejected.
def test_cross_tenant_access_rejected(client: TestClient, db_session: Session):
    co_a, pm_a, proj_a, req_a = setup_test_context(db_session)
    co_b, pm_b, proj_b, req_b = setup_test_context(db_session)

    # PM B trying to access Requirement A
    headers_b = get_auth_headers(pm_b.id)
    res = client.post(
        f"/projects/{proj_a.id}/requirements/{req_a.id}/test-cases/generate",
        headers=headers_b,
    )
    assert res.status_code == 403
    assert "access" in res.json()["message"].lower()


# 4. Missing requirement returns correct error.
def test_missing_requirement_returns_correct_error(client: TestClient, db_session: Session):
    company, pm, project, _ = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)
    fake_req_id = uuid.uuid4()

    res = client.post(
        f"/projects/{project.id}/requirements/{fake_req_id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 404
    assert "Requirement not found" in res.json()["message"]


# 5. AI generation succeeds and updates AIJob.
def test_ai_generation_succeeds(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 201

    job = db_session.query(AIJob).filter(
        AIJob.project_id == project.id,
        AIJob.type == "TEST_CASE_GENERATION",
    ).first()
    assert job is not None
    assert job.status == AIJobStatus.COMPLETED
    assert job.result_metadata is not None
    assert job.result_metadata["generated_count"] >= 4


# 6. AI output is validated against schema.
def test_ai_output_validated(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 201
    for tc in res.json()["data"]:
        assert "title" in tc and len(tc["title"]) > 0
        assert "category" in tc and tc["category"] in ("FUNCTIONAL", "NEGATIVE", "BOUNDARY", "ACCEPTANCE")
        assert "priority" in tc and tc["priority"] in ("LOW", "MEDIUM", "HIGH", "URGENT")
        assert "expected_result" in tc and len(tc["expected_result"]) > 0
        assert isinstance(tc["test_steps"], list)
        for step in tc["test_steps"]:
            assert "step" in step
            assert "action" in step
            assert "expected_result" in step


# 7. Generated cases are saved as DRAFT.
def test_generated_cases_saved_as_draft(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 201
    saved_cases = db_session.query(TestCase).filter(TestCase.requirement_id == req.id).all()
    assert len(saved_cases) >= 4
    for tc in saved_cases:
        assert tc.status == TestCaseStatus.DRAFT
        assert tc.approved_by is None
        assert tc.approved_at is None


# 8. Functional cases are generated correctly.
def test_functional_cases_generated_correctly(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    data = res.json()["data"]
    func_cases = [tc for tc in data if tc["category"] == "FUNCTIONAL"]
    assert len(func_cases) >= 1
    assert "TC-FUNC" in func_cases[0]["title"]


# 9. Negative cases are generated correctly.
def test_negative_cases_generated_correctly(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    data = res.json()["data"]
    neg_cases = [tc for tc in data if tc["category"] == "NEGATIVE"]
    assert len(neg_cases) >= 1
    assert "TC-NEG" in neg_cases[0]["title"]


# 10. Boundary cases are generated correctly.
def test_boundary_cases_generated_correctly(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    data = res.json()["data"]
    boundary_cases = [tc for tc in data if tc["category"] == "BOUNDARY"]
    assert len(boundary_cases) >= 1
    assert "TC-BOUND" in boundary_cases[0]["title"]


# 11. Acceptance cases are generated correctly.
def test_acceptance_cases_generated_correctly(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    data = res.json()["data"]
    acc_cases = [tc for tc in data if tc["category"] == "ACCEPTANCE"]
    assert len(acc_cases) >= 1
    assert "TC-ACC" in acc_cases[0]["title"]


# 12. Duplicate / invalid output is handled.
def test_duplicate_invalid_output_handled(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    # Empty title requirement rejected
    empty_req = Requirement(
        project_id=project.id,
        company_id=company.id,
        requirement_key="REQ-EMPTY",
        title="   ",
        description="",
        created_by=pm.id,
    )
    db_session.add(empty_req)
    db_session.commit()

    res = client.post(
        f"/projects/{project.id}/requirements/{empty_req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 400
    assert "empty" in res.json()["message"].lower()


# 13. Entitlement blocks unauthorized generation (FREE plan).
def test_entitlement_blocks_unauthorized_generation(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session, plan=SubscriptionPlan.FREE)
    headers = get_auth_headers(pm.id)

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 403
    assert "AI Test Case Generator is not available on your current plan." in res.json()["message"]


# 14. AI usage limit is enforced.
def test_ai_usage_limit_enforced(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session, plan=SubscriptionPlan.STARTER)
    headers = get_auth_headers(pm.id)

    # Populate dummy AIJob rows up to STARTER quota (300)
    jobs = [
        AIJob(
            project_id=project.id,
            type="TEST",
            status=AIJobStatus.COMPLETED,
            created_by=pm.id,
        )
        for _ in range(300)
    ]
    db_session.bulk_save_objects(jobs)
    db_session.commit()

    res = client.post(
        f"/projects/{project.id}/requirements/{req.id}/test-cases/generate",
        headers=headers,
    )
    assert res.status_code == 403
    assert "Your organization's AI usage limit has been reached." in res.json()["message"]


# 15. Test case editing works.
def test_test_case_editing_works(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    tc = TestCase(
        company_id=company.id,
        project_id=project.id,
        requirement_id=req.id,
        title="Initial Test Case Title",
        description="Initial description",
        category=TestCaseCategory.FUNCTIONAL,
        priority=TestCasePriority.LOW,
        status=TestCaseStatus.DRAFT,
        source=TestCaseSource.AI_GENERATED,
        test_steps=[{"step": 1, "action": "Act 1", "expected_result": "Exp 1"}],
        expected_result="Initial expected result",
        created_by=pm.id,
    )
    db_session.add(tc)
    db_session.commit()
    db_session.refresh(tc)

    # Edit via PATCH
    update_payload = {
        "title": "Updated Test Case Title by Reviewer",
        "priority": "HIGH",
        "expected_result": "Updated specific outcome",
        "preconditions": "Admin user logged in",
        "test_steps": [
            {"step": 1, "action": "Act 1", "expected_result": "Exp 1"},
            {"step": 2, "action": "Act 2", "expected_result": "Exp 2"},
        ],
    }
    res = client.patch(
        f"/projects/{project.id}/test-cases/{tc.id}",
        json=update_payload,
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["title"] == "Updated Test Case Title by Reviewer"
    assert data["priority"] == "HIGH"
    assert data["expected_result"] == "Updated specific outcome"
    assert data["preconditions"] == "Admin user logged in"
    assert len(data["test_steps"]) == 2
    # Status MUST remain DRAFT after edit
    assert data["status"] == "DRAFT"


# 16. Approval works.
def test_test_case_approval_works(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    tc = TestCase(
        company_id=company.id,
        project_id=project.id,
        requirement_id=req.id,
        title="Test Case to Approve",
        description="Verify approval transition",
        category=TestCaseCategory.FUNCTIONAL,
        priority=TestCasePriority.MEDIUM,
        status=TestCaseStatus.DRAFT,
        source=TestCaseSource.AI_GENERATED,
        test_steps=[],
        expected_result="Outcome",
        created_by=pm.id,
    )
    db_session.add(tc)
    db_session.commit()
    db_session.refresh(tc)

    res = client.post(f"/projects/{project.id}/test-cases/{tc.id}/approve", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "APPROVED"
    assert data["approved_by"] == str(pm.id)
    assert data["approved_at"] is not None


# 17. Rejection works.
def test_test_case_rejection_works(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    tc = TestCase(
        company_id=company.id,
        project_id=project.id,
        requirement_id=req.id,
        title="Test Case to Reject",
        description="Verify rejection transition",
        category=TestCaseCategory.FUNCTIONAL,
        priority=TestCasePriority.MEDIUM,
        status=TestCaseStatus.DRAFT,
        source=TestCaseSource.AI_GENERATED,
        test_steps=[],
        expected_result="Outcome",
        created_by=pm.id,
    )
    db_session.add(tc)
    db_session.commit()
    db_session.refresh(tc)

    res = client.post(f"/projects/{project.id}/test-cases/{tc.id}/reject", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "REJECTED"
    assert data["approved_by"] is None


# 18. Approved test case persists after reload / re-query.
def test_approved_test_case_persists_after_reload(client: TestClient, db_session: Session):
    company, pm, project, req = setup_test_context(db_session)
    headers = get_auth_headers(pm.id)

    tc = TestCase(
        company_id=company.id,
        project_id=project.id,
        requirement_id=req.id,
        title="Persistent Approved Case",
        description="Check persistence across re-queries",
        category=TestCaseCategory.ACCEPTANCE,
        priority=TestCasePriority.HIGH,
        status=TestCaseStatus.DRAFT,
        source=TestCaseSource.AI_GENERATED,
        test_steps=[{"step": 1, "action": "Verify", "expected_result": "Passed"}],
        expected_result="Verified",
        created_by=pm.id,
    )
    db_session.add(tc)
    db_session.commit()
    db_session.refresh(tc)

    # Approve
    res_approve = client.post(f"/projects/{project.id}/test-cases/{tc.id}/approve", headers=headers)
    assert res_approve.status_code == 200

    # Query via list endpoint
    res_list = client.get(
        f"/projects/{project.id}/requirements/{req.id}/test-cases?status=APPROVED",
        headers=headers,
    )
    assert res_list.status_code == 200
    list_data = res_list.json()["data"]
    assert list_data["total"] == 1
    assert list_data["items"][0]["id"] == str(tc.id)
    assert list_data["items"][0]["status"] == "APPROVED"
    assert list_data["counts_by_status"]["APPROVED"] == 1

    # Query single item endpoint
    res_single = client.get(f"/projects/{project.id}/test-cases/{tc.id}", headers=headers)
    assert res_single.status_code == 200
    assert res_single.json()["data"]["status"] == "APPROVED"
