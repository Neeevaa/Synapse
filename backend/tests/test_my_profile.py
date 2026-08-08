import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole
from app.models.user import User
from app.core.security import create_access_token, verify_password
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_get_me_returns_company_and_project_memberships(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Acme Tech")
    owner = create_user(db_session, company, email="owner@acmetech.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Project Apollo")

    # Add project membership for owner
    from app.models.project_member import ProjectMember
    member = ProjectMember(
        project_id=project.id,
        user_id=owner.id,
        role=ProjectRole.PROJECT_MANAGER,
    )
    db_session.add(member)
    db_session.commit()

    headers = get_auth_headers(owner.id)
    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["company_name"] == "Acme Tech"
    assert data["company_role"] == "OWNER"
    assert len(data["project_memberships"]) == 1
    assert data["project_memberships"][0]["project_name"] == "Project Apollo"
    assert data["project_memberships"][0]["project_role"] == "PROJECT_MANAGER"


def test_user_cannot_update_another_user_profile(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Security Co")
    user_a = create_user(db_session, company, email="usera@sec.com", first_name="Alice")
    user_b = create_user(db_session, company, email="userb@sec.com", first_name="Bob")

    headers_a = get_auth_headers(user_a.id)

    # User A attempts to send user_id parameter in payload targeting User B
    payload = {
        "user_id": str(user_b.id),  # Arbitrary target user ID attempt
        "first_name": "AliceUpdated",
        "designation": "Staff Engineer",
        "bio": "User A bio details.",
    }
    response = client.patch("/auth/profile", json=payload, headers=headers_a)

    assert response.status_code == 200, response.text
    
    # Reload User A and User B from DB
    db_session.refresh(user_a)
    db_session.refresh(user_b)

    # Assert User A was updated
    assert user_a.first_name == "AliceUpdated"
    assert user_a.designation == "Staff Engineer"

    # Assert User B was completely UNTOUCHED
    assert user_b.first_name == "Bob", "Security Violation: User A modified User B's profile!"


def test_change_password_success_and_invalid_old_password_rejection(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Password Test Inc")
    user = create_user(
        db_session,
        company,
        email="user@pwd.com",
        password_hash="$2b$12$eImiTXuWVxfM37uY4JANjO5E.y5bS1a.a30M087M1/mO.gO/O.gO." # hashed password for "OldPassword123!"
    )

    headers = get_auth_headers(user.id)

    # 1. Attempt change password with wrong old password
    res_fail = client.post(
        "/auth/change-password",
        json={"old_password": "WrongPassword!", "new_password": "NewPassword123!"},
        headers=headers,
    )
    assert res_fail.status_code == 401, res_fail.text

    # 2. Change password with correct old password via login check
    from app.core.security import hash_password
    user.password_hash = hash_password("ValidOldPassword123!")
    db_session.commit()

    res_ok = client.post(
        "/auth/change-password",
        json={"old_password": "ValidOldPassword123!", "new_password": "NewSecretPassword123!"},
        headers=headers,
    )
    assert res_ok.status_code == 200, res_ok.text

    db_session.refresh(user)
    assert verify_password("NewSecretPassword123!", user.password_hash) is True
