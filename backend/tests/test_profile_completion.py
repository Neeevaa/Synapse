import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole
from app.core.security import create_access_token
from tests.conftest import create_company, create_user


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_partial_profile_update_keeps_profile_completed_false(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Profile Test Co")
    user = create_user(
        db_session,
        company,
        email="dev@profiletest.com",
        role=CompanyRole.ADMIN,
        is_verified=True,
    )
    user.profile_completed = False
    db_session.commit()

    headers = get_auth_headers(user.id)

    # Update avatar_url only
    response = client.patch(
        "/auth/profile",
        json={"avatar_url": "https://example.com/avatar.png"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["avatar_url"] == "https://example.com/avatar.png"
    assert data["profile_completed"] is False, "Expected profile_completed to remain False on partial update"


def test_designation_only_keeps_profile_completed_false(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Profile Test Co 2")
    user = create_user(
        db_session,
        company,
        email="dev2@profiletest.com",
        role=CompanyRole.ADMIN,
    )
    user.profile_completed = False
    db_session.commit()

    headers = get_auth_headers(user.id)

    # Provide designation but no bio
    response = client.patch(
        "/auth/profile",
        json={"designation": "Senior Full-Stack Engineer"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["designation"] == "Senior Full-Stack Engineer"
    assert data["bio"] is None
    assert data["profile_completed"] is False, "Expected profile_completed to remain False when bio is missing"


def test_whitespace_bio_keeps_profile_completed_false(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Profile Test Co 3")
    user = create_user(
        db_session,
        company,
        email="dev3@profiletest.com",
        role=CompanyRole.ADMIN,
    )
    user.profile_completed = False
    db_session.commit()

    headers = get_auth_headers(user.id)

    # Provide designation and whitespace bio
    response = client.patch(
        "/auth/profile",
        json={
            "designation": "Project Lead",
            "bio": "     ",
        },
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["profile_completed"] is False, "Expected profile_completed to remain False on whitespace bio"


def test_full_profile_update_flips_profile_completed_true(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Profile Test Co 4")
    user = create_user(
        db_session,
        company,
        email="dev4@profiletest.com",
        role=CompanyRole.ADMIN,
    )
    user.profile_completed = False
    db_session.commit()

    headers = get_auth_headers(user.id)

    # Provide both required fields: non-empty designation and bio
    payload = {
        "designation": "Principal Architect",
        "bio": "Passionate about cloud architecture and distributed AI systems.",
        "avatar_url": "https://example.com/avatar4.png",
    }
    response = client.patch(
        "/auth/profile",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["designation"] == "Principal Architect"
    assert data["bio"] == "Passionate about cloud architecture and distributed AI systems."
    assert data["profile_completed"] is True, "Expected profile_completed to flip to True when all required fields are filled"
