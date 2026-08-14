import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, SubscriptionPlan
from app.models.user import User
from app.models.company import Company
from app.core.security import create_access_token
from app.subscriptions.service import EntitlementService
from app.subscriptions.entitlements import (
    FEATURE_BASIC_TASKS,
    FEATURE_ADVANCED_TASKS,
    FEATURE_AI_TEST_CASES,
    FEATURE_RAG,
    FEATURE_SSO,
)
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_free_tier_entitlements_and_limits(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Free Tier Co", slug="free-tier-co")
    company.subscription_plan = SubscriptionPlan.FREE
    db_session.commit()

    owner = create_user(db_session, company, email="free_owner@test.com", role=CompanyRole.OWNER)
    u2 = create_user(db_session, company, email="free_u2@test.com", role=None)
    u3 = create_user(db_session, company, email="free_u3@test.com", role=None)
    db_session.commit()

    owner_headers = get_auth_headers(owner.id)

    # 1. Project Creation Limit (FREE limit = 2 projects)
    p1 = client.post("/projects", json={"name": "Project 1"}, headers=owner_headers)
    assert p1.status_code == 201
    p2 = client.post("/projects", json={"name": "Project 2"}, headers=owner_headers)
    assert p2.status_code == 201

    # 3rd project creation must be blocked with HTTP 403
    p3 = client.post("/projects", json={"name": "Project 3"}, headers=owner_headers)
    assert p3.status_code == 403
    assert "Subscription limit reached" in p3.json()["message"]

    # 2. User Creation Limit (FREE limit = 3 users)
    # Adding a 4th user via add_member_by_email must be blocked with 403
    proj1_id = p1.json()["data"]["id"]
    res_add_user = client.post(
        f"/projects/{proj1_id}/members",
        json={"email": "free_u4_new@test.com", "role": "DEVELOPER"},
        headers=owner_headers,
    )
    assert res_add_user.status_code == 403
    assert "Subscription limit reached" in res_add_user.json()["message"]


def test_starter_tier_entitlements_and_limits(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Starter Co", slug="starter-co")
    company.subscription_plan = SubscriptionPlan.STARTER
    db_session.commit()

    ent_service = EntitlementService(db_session)
    effective = ent_service.get_effective_entitlements(company.id)

    assert effective.max_users == 10
    assert effective.max_active_projects == 10
    assert effective.max_ai_executions == 300
    assert effective.max_automation_workflows == 10
    assert FEATURE_ADVANCED_TASKS in effective.enabled_features
    assert FEATURE_AI_TEST_CASES in effective.enabled_features


def test_pro_tier_entitlements_and_limits(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Pro Co", slug="pro-co")
    company.subscription_plan = SubscriptionPlan.PRO
    db_session.commit()

    ent_service = EntitlementService(db_session)
    effective = ent_service.get_effective_entitlements(company.id)

    assert effective.max_users == 50
    assert effective.max_active_projects == -1
    assert effective.max_ai_executions == -1
    assert FEATURE_RAG in effective.enabled_features


def test_feature_entitlement_access(db_session: Session):
    free_co = create_company(db_session, name="Free Feature Co", slug="free-feature-co")
    free_co.subscription_plan = SubscriptionPlan.FREE

    pro_co = create_company(db_session, name="Pro Feature Co", slug="pro-feature-co")
    pro_co.subscription_plan = SubscriptionPlan.PRO
    db_session.commit()

    ent_service = EntitlementService(db_session)

    # Free tier feature check
    with pytest.raises(Exception) as exc_info:
        ent_service.check_feature_entitlement(free_co.id, FEATURE_RAG)
    assert "403" in str(exc_info.value.status_code)

    # Pro tier feature check succeeds without exception
    ent_service.check_feature_entitlement(pro_co.id, FEATURE_RAG)


def test_super_admin_custom_enterprise_resource_overrides(client: TestClient, db_session: Session):
    super_admin = User(
        email="res_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    company = create_company(db_session, name="Enterprise Co", slug="enterprise-co")
    company.subscription_plan = SubscriptionPlan.ENTERPRISE
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    # 1. GET initial resource allocation
    res_get = client.get(f"/admin/companies/{company.id}/resources", headers=admin_headers)
    assert res_get.status_code == 200
    assert res_get.json()["data"]["effective_max_users"] == -1

    # 2. PATCH custom overrides
    res_patch = client.patch(
        f"/admin/companies/{company.id}/resources",
        json={
            "custom_max_users": 250,
            "custom_max_projects": 150,
            "custom_features": [FEATURE_SSO, "FEATURE_CUSTOM_AI"],
            "reason": "Enterprise custom contract SLA",
        },
        headers=admin_headers,
    )
    assert res_patch.status_code == 200
    patch_data = res_patch.json()["data"]
    assert patch_data["custom_max_users"] == 250
    assert patch_data["effective_max_users"] == 250
    assert FEATURE_SSO in patch_data["effective_enabled_features"]

    # 3. Verify audit log creation
    res_audit = client.get(f"/admin/audit-logs?company_id={company.id}&action=RESOURCE_LIMIT_CHANGED", headers=admin_headers)
    assert res_audit.status_code == 200
    assert len(res_audit.json()["data"]["logs"]) == 1


def test_plan_downgrade_safety_behavior(client: TestClient, db_session: Session):
    super_admin = User(
        email="downgrade_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    # Create company on STARTER plan with 5 users
    company = create_company(db_session, name="Downgrade Co", slug="downgrade-co")
    company.subscription_plan = SubscriptionPlan.STARTER
    owner = create_user(db_session, company, email="dg_owner@test.com", role=CompanyRole.OWNER)
    for i in range(4):
        create_user(db_session, company, email=f"dg_u{i}@test.com", role=None)
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)
    owner_headers = get_auth_headers(owner.id)

    # Super Admin downgrades company to FREE (max 3 users)
    res_downgrade = client.patch(
        f"/admin/companies/{company.id}",
        json={"subscription_plan": "FREE"},
        headers=admin_headers,
    )
    assert res_downgrade.status_code == 200

    # 1. Existing 5 users are preserved (not deleted)
    user_count = db_session.query(User).filter(User.company_id == company.id).count()
    assert user_count == 5

    # 2. Resource check returns warning explaining exceeded limits
    res_res = client.get(f"/admin/companies/{company.id}/resources", headers=admin_headers)
    assert res_res.status_code == 200
    warnings = res_res.json()["data"]["warnings"]
    assert len(warnings) >= 1
    assert "exceeds plan limit (3)" in warnings[0]

    # 3. New project or user creation is blocked with 403
    res_add_member = client.post(
        "/projects",
        json={"name": "Exceeded Project Test"},
        headers=owner_headers,
    )
    # FREE limit is 2 projects; currently 0 projects exist, so project creation works, but user creation is blocked
    proj_id = client.post("/projects", json={"name": "P1"}, headers=owner_headers).json()["data"]["id"]
    res_block_user = client.post(
        f"/projects/{proj_id}/members",
        json={"email": "dg_blocked_u@test.com", "role": "DEVELOPER"},
        headers=owner_headers,
    )
    assert res_block_user.status_code == 403


def test_unauthorized_resource_allocation_modification(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Unauth Resource Co", slug="unauth-res-co")
    owner = create_user(db_session, company, email="res_unauth_owner@test.com", role=CompanyRole.OWNER)

    owner_headers = get_auth_headers(owner.id)

    res_get = client.get(f"/admin/companies/{company.id}/resources", headers=owner_headers)
    assert res_get.status_code == 403

    res_patch = client.patch(
        f"/admin/companies/{company.id}/resources",
        json={"custom_max_users": 999},
        headers=owner_headers,
    )
    assert res_patch.status_code == 403
