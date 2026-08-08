import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole, SubscriptionPlan
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project, create_pending_membership


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_get_subscription_plans_endpoint(client: TestClient):
    response = client.get("/companies/plans")
    assert response.status_code == 200, response.text
    plans_data = response.json()["data"]
    assert "FREE" in plans_data
    assert "STARTER" in plans_data
    assert "PRO" in plans_data
    assert "ENTERPRISE" in plans_data

    starter = plans_data["STARTER"]
    assert starter["price"] == "$19 / month"
    assert starter["limits"]["max_team_members"] == 10
    assert starter["limits"]["max_active_projects"] == 10

    pro = plans_data["PRO"]
    assert pro["is_popular"] is True
    assert pro["price"] == "$49 / month"


def test_get_company_profile_success(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Acme Inc")
    owner = create_user(db_session, company, email="owner@acme.com", role=CompanyRole.OWNER)

    headers = get_auth_headers(owner.id)
    response = client.get("/companies/me", headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["name"] == "Acme Inc"
    assert data["subscription_plan"] == "FREE"
    assert data["default_project_visibility"] == "PRIVATE"
    assert data["entitlements"] is not None
    assert data["entitlements"]["limits"]["max_team_members"] == 3


def test_update_company_profile_by_owner_succeeds(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Beta Corp")
    owner = create_user(db_session, company, email="owner@beta.com", role=CompanyRole.OWNER)

    headers = get_auth_headers(owner.id)
    payload = {
        "name": "Beta Corporation Global",
        "description": "Leading global provider of innovative workflow tools.",
        "logo_url": "https://example.com/logo.png",
    }
    response = client.patch("/companies/me", json=payload, headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["name"] == "Beta Corporation Global"
    assert data["description"] == "Leading global provider of innovative workflow tools."
    assert data["logo_url"] == "https://example.com/logo.png"


def test_update_company_settings_by_owner_succeeds(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Gamma Inc")
    owner = create_user(db_session, company, email="owner@gamma.com", role=CompanyRole.OWNER)

    headers = get_auth_headers(owner.id)
    payload = {"default_project_visibility": "INTERNAL"}
    response = client.patch("/companies/me/settings", json=payload, headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["default_project_visibility"] == "INTERNAL"


def test_update_company_plan_all_4_tiers(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Delta Tech")
    owner = create_user(db_session, company, email="owner@delta.com", role=CompanyRole.OWNER)

    headers = get_auth_headers(owner.id)

    # 1. Update to STARTER
    res_starter = client.patch("/companies/me/plan", json={"subscription_plan": "STARTER"}, headers=headers)
    assert res_starter.status_code == 200, res_starter.text
    assert res_starter.json()["data"]["subscription_plan"] == "STARTER"
    assert res_starter.json()["data"]["entitlements"]["limits"]["max_team_members"] == 10

    # 2. Update to PRO
    res_pro = client.patch("/companies/me/plan", json={"subscription_plan": "PRO"}, headers=headers)
    assert res_pro.status_code == 200, res_pro.text
    assert res_pro.json()["data"]["subscription_plan"] == "PRO"
    assert res_pro.json()["data"]["entitlements"]["is_popular"] is True

    # 3. Update to ENTERPRISE
    res_ent = client.patch("/companies/me/plan", json={"subscription_plan": "ENTERPRISE"}, headers=headers)
    assert res_ent.status_code == 200, res_ent.text
    assert res_ent.json()["data"]["subscription_plan"] == "ENTERPRISE"


def test_update_company_by_developer_rejected(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Epsilon Solutions")
    developer = create_user(db_session, company, email="dev@epsilon.com", role=None)

    headers = get_auth_headers(developer.id)

    res_profile = client.patch("/companies/me", json={"name": "Hacked Name"}, headers=headers)
    assert res_profile.status_code == 403, res_profile.text

    res_plan = client.patch("/companies/me/plan", json={"subscription_plan": "ENTERPRISE"}, headers=headers)
    assert res_plan.status_code == 403, res_plan.text


def test_cross_tenant_company_access_rejected(client: TestClient, db_session: Session):
    company_a = create_company(db_session, name="Company A")
    owner_a = create_user(db_session, company_a, email="owner@comp-a.com", role=CompanyRole.OWNER)

    company_b = create_company(db_session, name="Company B")

    headers = get_auth_headers(owner_a.id)

    res_get = client.get(f"/companies/{company_b.id}", headers=headers)
    assert res_get.status_code == 403, res_get.text

    res_patch = client.patch(f"/companies/{company_b.id}", json={"name": "Comp B Renamed"}, headers=headers)
    assert res_patch.status_code == 403, res_patch.text
