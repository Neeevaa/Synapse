import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement, RequirementVersion
from app.models.enums import (
    CompanyRole,
    ProjectRole,
    SubscriptionPlan,
    RequirementType,
    RequirementStatus,
    RequirementPriority,
    RequirementSource,
)
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_create_requirement(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Req Company")
    pm = create_user(db_session, co, email="pm_req@req.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Req Project")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    payload = {
        "title": "User Authentication System",
        "description": "System shall allow users to log in with OAuth2 or JWT.",
        "requirement_type": "FUNCTIONAL",
        "priority": "HIGH",
        "source": "SRS",
        "acceptance_criteria": "1. JWT tokens expire in 60 mins.\n2. OAuth2 supports Google.",
    }

    res = client.post(f"/projects/{proj.id}/requirements", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()["data"]

    assert data["requirement_key"] == "REQ-1"
    assert data["title"] == "User Authentication System"
    assert data["status"] == "DRAFT"
    assert data["current_version"] == 1
    assert len(data["versions"]) == 1
    assert data["versions"][0]["version_number"] == 1
    assert data["versions"][0]["change_summary"] == "Initial requirement created"


def test_requirement_versioning_on_update(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Version Company")
    pm = create_user(db_session, co, email="pm_ver@req.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Version Project")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    payload = {
        "title": "Initial Requirement Title",
        "description": "Initial requirement description.",
        "requirement_type": "FUNCTIONAL",
        "priority": "MEDIUM",
    }
    res_create = client.post(f"/projects/{proj.id}/requirements", json=payload, headers=headers)
    assert res_create.status_code == 201
    req_id = res_create.json()["data"]["id"]

    # Perform update
    update_payload = {
        "title": "Updated Requirement Title",
        "description": "Updated detailed requirement description.",
        "change_summary": "Expanded authentication scope to include MFA.",
    }
    res_update = client.put(f"/projects/{proj.id}/requirements/{req_id}", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    data_up = res_update.json()["data"]

    assert data_up["current_version"] == 2
    assert data_up["title"] == "Updated Requirement Title"
    assert len(data_up["versions"]) == 2

    # Verify historical version v1 remains intact
    v1 = [v for v in data_up["versions"] if v["version_number"] == 1][0]
    v2 = [v for v in data_up["versions"] if v["version_number"] == 2][0]

    assert v1["title"] == "Initial Requirement Title"
    assert v2["title"] == "Updated Requirement Title"
    assert v2["change_summary"] == "Expanded authentication scope to include MFA."


def test_list_and_filter_requirements(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Filter Company")
    pm = create_user(db_session, co, email="pm_filt@req.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Filter Project")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    headers = get_auth_headers(pm.id)

    # Create 3 requirements
    client.post(
        f"/projects/{proj.id}/requirements",
        json={"title": "Requirement Alpha", "description": "Functional req A", "requirement_type": "FUNCTIONAL", "priority": "HIGH"},
        headers=headers,
    )
    client.post(
        f"/projects/{proj.id}/requirements",
        json={"title": "Requirement Beta", "description": "Non-functional req B", "requirement_type": "NON_FUNCTIONAL", "priority": "LOW"},
        headers=headers,
    )
    client.post(
        f"/projects/{proj.id}/requirements",
        json={"title": "User Story Gamma", "description": "As a user I want dashboard", "requirement_type": "USER_STORY", "priority": "URGENT"},
        headers=headers,
    )

    # Filter by type
    res_type = client.get(f"/projects/{proj.id}/requirements?requirement_type=USER_STORY", headers=headers)
    assert res_type.status_code == 200
    assert len(res_type.json()["data"]["requirements"]) == 1
    assert res_type.json()["data"]["requirements"][0]["title"] == "User Story Gamma"

    # Search keyword
    res_kw = client.get(f"/projects/{proj.id}/requirements?keyword=Alpha", headers=headers)
    assert res_kw.status_code == 200
    assert len(res_kw.json()["data"]["requirements"]) == 1
    assert res_kw.json()["data"]["requirements"][0]["title"] == "Requirement Alpha"


def test_status_transitions_and_rbac(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Status Company")
    pm = create_user(db_session, co, email="pm_stat@req.com", role=None)
    dev = create_user(db_session, co, email="dev_stat@req.com", role=None)
    proj = create_project(db_session, co, name="Status Project")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    dev_mem = ProjectMember(project_id=proj.id, user_id=dev.id, role=ProjectRole.DEVELOPER)
    db_session.add_all([pm_mem, dev_mem])
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    headers_dev = get_auth_headers(dev.id)

    # PM creates requirement
    res_create = client.post(
        f"/projects/{proj.id}/requirements",
        json={"title": "Security Audit Requirement", "description": "Conduct security audit"},
        headers=headers_pm,
    )
    req_id = res_create.json()["data"]["id"]

    # Developer submits for review -> allowed
    res_review = client.patch(
        f"/projects/{proj.id}/requirements/{req_id}/status",
        json={"status": "REVIEW"},
        headers=headers_dev,
    )
    assert res_review.status_code == 200
    assert res_review.json()["data"]["status"] == "REVIEW"

    # Developer attempts to approve -> 403 Forbidden
    res_dev_approve = client.patch(
        f"/projects/{proj.id}/requirements/{req_id}/status",
        json={"status": "APPROVED"},
        headers=headers_dev,
    )
    assert res_dev_approve.status_code == 403

    # PM approves -> 200 OK
    res_pm_approve = client.patch(
        f"/projects/{proj.id}/requirements/{req_id}/status",
        json={"status": "APPROVED"},
        headers=headers_pm,
    )
    assert res_pm_approve.status_code == 200
    assert res_pm_approve.json()["data"]["status"] == "APPROVED"


def test_cross_company_isolation(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company A Req")
    co_b = create_company(db_session, name="Company B Req")

    pm_a = create_user(db_session, co_a, email="pma_reqiso@coma.com", role=CompanyRole.ADMIN)
    pm_b = create_user(db_session, co_b, email="pmb_reqiso@comb.com", role=CompanyRole.ADMIN)

    proj_a = create_project(db_session, co_a, name="Project A Req")
    proj_b = create_project(db_session, co_b, name="Project B Req")

    pm_mem_a = ProjectMember(project_id=proj_a.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    pm_mem_b = ProjectMember(project_id=proj_b.id, user_id=pm_b.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add_all([pm_mem_a, pm_mem_b])
    db_session.commit()

    headers_a = get_auth_headers(pm_a.id)
    headers_b = get_auth_headers(pm_b.id)

    # PM A creates requirement in Project A
    res_create = client.post(
        f"/projects/{proj_a.id}/requirements",
        json={"title": "Company A Proprietary Spec", "description": "Confidential"},
        headers=headers_a,
    )
    req_id = res_create.json()["data"]["id"]

    # PM B from Company B attempts to view Project A's requirements -> 403 Forbidden
    res_cross_list = client.get(f"/projects/{proj_a.id}/requirements", headers=headers_b)
    assert res_cross_list.status_code == 403

    # PM B attempts to view requirement detail directly -> 403 Forbidden
    res_cross_detail = client.get(f"/projects/{proj_a.id}/requirements/{req_id}", headers=headers_b)
    assert res_cross_detail.status_code == 403
