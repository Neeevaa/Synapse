import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, SubscriptionPlan, CompanyStatus, AIJobStatus
from app.models.company import Company
from app.models.user import User
from app.models.ai_job import AIJob
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_admin_analytics_authorization(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Analytics Auth Co", slug="analytics-auth-co")
    owner = create_user(db_session, company, email="an_owner@test.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="an_dev@test.com", role=None)

    owner_headers = get_auth_headers(owner.id)
    dev_headers = get_auth_headers(dev.id)

    endpoints = [
        "/admin/analytics/overview",
        "/admin/analytics/growth",
        "/admin/analytics/subscriptions",
        "/admin/analytics/ai-usage",
    ]

    for ep in endpoints:
        # Unauthenticated -> 401
        res_unauth = client.get(ep)
        assert res_unauth.status_code == 401, f"Unauthenticated request to {ep} expected 401"

        # Non-super admin owner -> 403
        res_owner = client.get(ep, headers=owner_headers)
        assert res_owner.status_code == 403, f"Owner request to {ep} expected 403, got {res_owner.status_code}"

        # Non-super admin developer -> 403
        res_dev = client.get(ep, headers=dev_headers)
        assert res_dev.status_code == 403, f"Dev request to {ep} expected 403, got {res_dev.status_code}"


def test_admin_analytics_overview_aggregation(client: TestClient, db_session: Session):
    super_admin = User(
        email="overview_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    # Company 1: ACTIVE, FREE
    c1 = create_company(db_session, name="Co 1 Overview", slug="co-1-overview")
    c1.subscription_plan = SubscriptionPlan.FREE
    c1.status = CompanyStatus.ACTIVE
    u1 = create_user(db_session, c1, email="c1_u1@test.com", role=CompanyRole.OWNER)
    p1 = create_project(db_session, c1, name="P1 Confidential")

    # Company 2: PENDING_APPROVAL, PRO
    c2 = Company(
        name="Co 2 Overview",
        slug="co-2-overview",
        subscription_plan=SubscriptionPlan.PRO,
        status=CompanyStatus.PENDING_APPROVAL,
        is_active=False,
    )
    db_session.add(c2)

    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    res = client.get("/admin/analytics/overview", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    assert data["total_companies"] >= 2
    assert data["active_companies"] >= 1
    assert data["pending_companies"] >= 1
    assert data["total_users"] >= 2  # super_admin + u1
    assert "companies_by_subscription_plan" in data
    assert data["companies_by_subscription_plan"]["FREE"] >= 1
    assert data["companies_by_subscription_plan"]["PRO"] >= 1


def test_admin_analytics_growth_time_series_and_date_filtering(client: TestClient, db_session: Session):
    super_admin = User(
        email="growth_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    for rng in ["7d", "30d", "90d", "1y"]:
        res = client.get(f"/admin/analytics/growth?range={rng}", headers=admin_headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert data["range"] == rng
        assert isinstance(data["company_registrations"], list)
        assert isinstance(data["user_registrations"], list)
        assert isinstance(data["ai_execution_volume"], list)
        assert isinstance(data["active_companies"], list)


def test_admin_analytics_subscriptions_distribution(client: TestClient, db_session: Session):
    super_admin = User(
        email="sub_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    res = client.get("/admin/analytics/subscriptions", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    assert "free_count" in data
    assert "starter_count" in data
    assert "pro_count" in data
    assert "enterprise_count" in data
    assert "total" in data
    assert "percentage_distribution" in data
    if data["total"] > 0:
        dist_sum = sum(data["percentage_distribution"].values())
        assert abs(dist_sum - 100.0) < 0.1


def test_admin_analytics_ai_usage_aggregation(client: TestClient, db_session: Session):
    super_admin = User(
        email="ai_usage_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    co = create_company(db_session, name="AI Analytics Co", slug="ai-analytics-co")
    u = create_user(db_session, co, email="ai_an_user@test.com", role=CompanyRole.OWNER)
    p = create_project(db_session, co, name="AI Project Test")

    j1 = AIJob(project_id=p.id, type="summarize", status=AIJobStatus.COMPLETED, created_by=u.id)
    j2 = AIJob(project_id=p.id, type="test_cases", status=AIJobStatus.RUNNING, created_by=u.id)
    db_session.add_all([j1, j2])
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    res = client.get("/admin/analytics/ai-usage", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    assert data["total_ai_executions"] >= 2
    assert data["completed_jobs"] >= 1
    assert data["running_jobs"] >= 1
    assert "executions_by_type" in data
    assert data["executions_by_type"].get("summarize", 0) >= 1


def test_admin_analytics_privacy_boundaries(client: TestClient, db_session: Session):
    super_admin = User(
        email="privacy_analytics_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    secret_co = create_company(db_session, name="Stealth Stealth Project", slug="stealth-stealth")
    secret_user = create_user(db_session, secret_co, email="stealth_u@test.com", role=CompanyRole.OWNER)
    secret_proj = create_project(db_session, secret_co, name="CLASSIFIED Stealth Weapon System")

    # Add secret task
    client.post(
        f"/projects/{secret_proj.id}/tasks",
        json={"title": "CLASSIFIED Nuclear Launch Codes Task", "description": "Highly Sensitive Payload"},
        headers=get_auth_headers(secret_user.id),
    )

    # Add AI Job with sensitive result metadata
    secret_job = AIJob(
        project_id=secret_proj.id,
        type="classified_analysis",
        status=AIJobStatus.COMPLETED,
        created_by=secret_user.id,
        result_metadata={"prompt": "Confidential Prompt Data", "response": "Secret AI Output Text"},
    )
    db_session.add(secret_job)
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    endpoints = [
        "/admin/analytics/overview",
        "/admin/analytics/growth",
        "/admin/analytics/subscriptions",
        "/admin/analytics/ai-usage",
    ]

    sensitive_tokens = [
        "CLASSIFIED Stealth Weapon System",
        "CLASSIFIED Nuclear Launch Codes Task",
        "Highly Sensitive Payload",
        "Confidential Prompt Data",
        "Secret AI Output Text",
    ]

    for ep in endpoints:
        res = client.get(ep, headers=admin_headers)
        assert res.status_code == 200, f"{ep} failed with status {res.status_code}"
        payload_text = str(res.json())

        for token in sensitive_tokens:
            assert token not in payload_text, f"Privacy violation: sensitive token '{token}' exposed in response from {ep}"
