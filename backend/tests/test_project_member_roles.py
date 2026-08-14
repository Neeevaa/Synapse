import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import ProjectRole, Specialization
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project, add_project_member


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_valid_4_value_roles_accepted(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Roles Co")
    pm = create_user(db_session, company, email="pm@roles.com", role=None)
    project = create_project(db_session, company, name="Roles Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    valid_roles = ["PROJECT_MANAGER", "TEAM_LEAD", "DEVELOPER", "VIEWER"]
    for idx, r in enumerate(valid_roles):
        email = f"user{idx}@roles.com"
        res = client.post(
            f"/projects/{project.id}/members",
            json={"email": email, "role": r},
            headers=headers,
        )
        assert res.status_code == 201, res.text
        data = res.json()["data"]
        assert data["role"] == r


def test_legacy_role_strings_rejected_with_422(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Legacy Reject Co")
    pm = create_user(db_session, company, email="pm@legacy.com", role=None)
    project = create_project(db_session, company, name="Legacy Reject Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    legacy_roles = [
        "DEVOPS_ENGINEER",
        "AI_ENGINEER",
        "BACKEND_DEVELOPER",
        "FRONTEND_DEVELOPER",
        "UI_UX_DESIGNER",
        "QA_ENGINEER",
    ]

    for leg in legacy_roles:
        res = client.post(
            f"/projects/{project.id}/members",
            json={"email": "target@legacy.com", "role": leg},
            headers=headers,
        )
        # Requirement 5: Pydantic rejects legacy values with 422 Unprocessable Entity
        assert res.status_code == 422, f"Expected 422 for legacy role '{leg}', got {res.status_code}"


def test_developer_specialization_defaults_to_other(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Spec Co")
    pm = create_user(db_session, company, email="pm@spec.com", role=None)
    project = create_project(db_session, company, name="Spec Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # 1. Developer with specialization omitted -> defaults to OTHER
    res_default = client.post(
        f"/projects/{project.id}/members",
        json={"email": "dev1@spec.com", "role": "DEVELOPER"},
        headers=headers,
    )
    assert res_default.status_code == 201, res_default.text
    data_default = res_default.json()["data"]
    assert data_default["role"] == "DEVELOPER"
    assert data_default["specialization"] == "OTHER"

    # 2. Developer with explicit specialization -> retains specialization
    res_explicit = client.post(
        f"/projects/{project.id}/members",
        json={"email": "dev2@spec.com", "role": "DEVELOPER", "specialization": "BACKEND"},
        headers=headers,
    )
    assert res_explicit.status_code == 201, res_explicit.text
    data_explicit = res_explicit.json()["data"]
    assert data_explicit["role"] == "DEVELOPER"
    assert data_explicit["specialization"] == "BACKEND"

    # 3. Non-Developer role (e.g. PROJECT_MANAGER) with specialization omitted -> remains None
    res_pm = client.post(
        f"/projects/{project.id}/members",
        json={"email": "pm2@spec.com", "role": "PROJECT_MANAGER"},
        headers=headers,
    )
    assert res_pm.status_code == 201, res_pm.text
    data_pm = res_pm.json()["data"]
    assert data_pm["role"] == "PROJECT_MANAGER"
    assert data_pm["specialization"] is None


def test_pending_membership_carries_specialization_to_project_member(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Carry Spec Co")
    pm = create_user(db_session, company, email="pm@carry.com", role=None)
    project = create_project(db_session, company, name="Carry Spec Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # 1. Invite a non-existent email with DEVELOPER and BACKEND specialization
    invite_res = client.post(
        f"/projects/{project.id}/members",
        json={"email": "newdev@carry.com", "role": "DEVELOPER", "specialization": "BACKEND"},
        headers=headers,
    )
    assert invite_res.status_code == 201, invite_res.text
    assert invite_res.json()["data"]["specialization"] == "BACKEND"

    # 2. Register new user via POST /auth/register/member
    reg_res = client.post(
        "/auth/register/member",
        json={
            "first_name": "New",
            "last_name": "Dev",
            "email": "newdev@carry.com",
            "password": "Password123!",
        },
    )
    assert reg_res.status_code == 201, reg_res.text

    # 3. Query ProjectMember record to verify role and specialization
    from app.models.project_member import ProjectMember
    from app.models.user import User

    new_user = db_session.query(User).filter(User.email == "newdev@carry.com").first()
    assert new_user is not None

    pm_record = (
        db_session.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == new_user.id)
        .first()
    )
    assert pm_record is not None
    assert pm_record.role == ProjectRole.DEVELOPER
    assert pm_record.specialization == Specialization.BACKEND


def test_cross_company_user_add_rejected(client: TestClient, db_session: Session):
    company_a = create_company(db_session, name="Company A")
    user_a = create_user(db_session, company_a, email="usera@compa.com", role=None)

    company_b = create_company(db_session, name="Company B")
    pm_b = create_user(db_session, company_b, email="pmb@compb.com", role=None)
    project_b = create_project(db_session, company_b, name="Project B")
    add_project_member(db_session, project_b, pm_b, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm_b.id)

    # Attempt to add user_a (Company A) to Project B (Company B)
    res = client.post(
        f"/projects/{project_b.id}/members",
        json={"email": user_a.email, "role": "DEVELOPER"},
        headers=headers,
    )
    assert res.status_code == 400, res.text
    assert "This email belongs to an account registered under a different company and can't be added to this project." in res.text


def test_same_company_user_add_succeeds(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Same Co")
    pm = create_user(db_session, company, email="pm@sameco.com", role=None)
    dev = create_user(db_session, company, email="dev@sameco.com", role=None)
    project = create_project(db_session, company, name="Same Co Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # Add dev (same company) to project
    res = client.post(
        f"/projects/{project.id}/members",
        json={"email": dev.email, "role": "DEVELOPER", "specialization": "FRONTEND"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["email"] == dev.email
    assert data["outcome"] == "added"
    assert data["specialization"] == "FRONTEND"


def test_pending_registration_company_alignment_safe(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Pending Align Co")
    pm = create_user(db_session, company, email="pm@align.com", role=None)
    project = create_project(db_session, company, name="Align Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # 1. PM invites non-existent user
    client.post(
        f"/projects/{project.id}/members",
        json={"email": "inviteduser@align.com", "role": "DEVELOPER"},
        headers=headers,
    )

    # 2. User registers via member flow
    reg_res = client.post(
        "/auth/register/member",
        json={
            "first_name": "Invited",
            "last_name": "User",
            "email": "inviteduser@align.com",
            "password": "Password123!",
        },
    )
    assert reg_res.status_code == 201, reg_res.text

    # 3. Assert registered user's company_id matches project's company_id
    from app.models.user import User

    registered_user = db_session.query(User).filter(User.email == "inviteduser@align.com").first()
    assert registered_user is not None
    assert str(registered_user.company_id) == str(company.id)
