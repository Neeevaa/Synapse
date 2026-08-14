import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole
from app.core.security import create_access_token
from tests.conftest import create_company, create_user
from app.activities.service import ActivityService


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_user_can_view_own_activities_paginated(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Activity Co")
    user = create_user(db_session, company, email="act_user@test.com")

    service = ActivityService(db_session)
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    act1 = service.log_activity(
        user_id=user.id,
        company_id=company.id,
        action="USER_LOGGED_IN",
        description="Logged into Synapse workspace.",
    )
    act1.created_at = now - timedelta(minutes=5)

    act2 = service.log_activity(
        user_id=user.id,
        company_id=company.id,
        action="PROFILE_UPDATED",
        description="Updated personal profile information.",
    )
    act2.created_at = now
    db_session.commit()

    headers = get_auth_headers(user.id)
    response = client.get("/activities?page=1&limit=10", headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["total"] == 2
    assert len(data["items"]) == 2
    # Newest first
    assert data["items"][0]["action"] == "PROFILE_UPDATED"
    assert data["items"][1]["action"] == "USER_LOGGED_IN"


def test_owner_can_view_company_member_activities(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Owner View Co")
    owner = create_user(db_session, company, email="owner@view.com", role=CompanyRole.OWNER)
    member = create_user(db_session, company, email="member@view.com", role=None)

    service = ActivityService(db_session)
    service.log_activity(
        user_id=member.id,
        company_id=company.id,
        action="USER_LOGGED_IN",
        description="Logged into workspace.",
    )

    headers = get_auth_headers(owner.id)
    response = client.get(f"/activities?user_id={member.id}", headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["user_id"] == str(member.id)


def test_member_cannot_view_other_member_activities(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Member Restriction Co")
    user_a = create_user(db_session, company, email="usera@restrict.com", role=None)
    user_b = create_user(db_session, company, email="userb@restrict.com", role=None)

    headers = get_auth_headers(user_a.id)
    response = client.get(f"/activities?user_id={user_b.id}", headers=headers)

    assert response.status_code == 403, response.text


def test_cross_tenant_activity_access_rejected(client: TestClient, db_session: Session):
    company_1 = create_company(db_session, name="Tenant 1")
    company_2 = create_company(db_session, name="Tenant 2")

    owner_1 = create_user(db_session, company_1, email="owner1@tenant1.com", role=CompanyRole.OWNER)
    user_2 = create_user(db_session, company_2, email="user2@tenant2.com", role=None)

    headers = get_auth_headers(owner_1.id)
    response = client.get(f"/activities?user_id={user_2.id}", headers=headers)

    assert response.status_code == 403, response.text
