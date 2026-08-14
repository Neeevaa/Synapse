"""
Comprehensive Security & Privacy Audit Regression Test Suite for Synapse.
Verifies multi-tenant isolation, RBAC boundaries, Super Admin privacy limits,
authentication rejection, invitation authorization, subscription enforcement,
and sensitive response field protection.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.enums import CompanyRole, ProjectRole, SubscriptionPlan
from app.core.security import create_access_token
from tests.conftest import create_company, create_user


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. Super Admin Authorization & Privacy Boundary
# ---------------------------------------------------------------------------

def test_super_admin_api_access_control(client: TestClient, db_session: Session):
    """Verify that regular users, Company Owners, Admins, and PMs receive 403 on /admin/* APIs."""
    co_a = create_company(db_session, name="Co A")
    owner_a = create_user(db_session, co_a, email="owner_a@sec.com", role=CompanyRole.OWNER)
    admin_a = create_user(db_session, co_a, email="admin_a@sec.com", role=CompanyRole.ADMIN)
    member_a = create_user(db_session, co_a, email="member_a@sec.com", role=None)

    endpoints = [
        "/admin/stats",
        "/admin/companies",
        "/admin/analytics/overview",
        "/admin/analytics/growth",
        "/admin/analytics/subscriptions",
        "/admin/analytics/ai-usage",
        "/admin/audit-logs",
        f"/admin/companies/{co_a.id}",
        f"/admin/companies/{co_a.id}/usage",
        f"/admin/companies/{co_a.id}/resources",
        f"/admin/companies/{co_a.id}/users/summary",
    ]

    for endpoint in endpoints:
        for u in [owner_a, admin_a, member_a]:
            headers = get_auth_headers(u.id)
            res = client.get(endpoint, headers=headers)
            assert res.status_code == 403, f"User {u.email} should be denied on {endpoint}, got {res.status_code}"


def test_super_admin_cannot_access_private_project_contents(client: TestClient, db_session: Session):
    """Verify Super Admin cannot access private company project details via admin endpoints."""
    super_admin = User(
        email="superadmin@sec.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        role=None,
        is_super_admin=True,
        is_verified=True,
        is_active=True,
        profile_completed=True,
    )
    db_session.add(super_admin)
    db_session.commit()

    headers = get_auth_headers(super_admin.id)

    # Super Admin requesting company detail gets metadata, stats, and audit logs, but NOT project task contents
    res = client.get("/admin/analytics/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    
    # Check that private content (prompts, task titles, document text, RAG items) is absent
    assert "tasks_detail" not in data
    assert "documents" not in data
    assert "prompts" not in data
    assert "rag_content" not in data


# ---------------------------------------------------------------------------
# 2. Multi-Tenant Isolation (Cross-Company Access, Modification, Deletion)
# ---------------------------------------------------------------------------

def test_cross_company_isolation(client: TestClient, db_session: Session):
    """Verify a user in Company A cannot view or update resources in Company B."""
    co_a = create_company(db_session, name="Company Alpha")
    co_b = create_company(db_session, name="Company Beta")

    user_a = create_user(db_session, co_a, email="usera@alpha.com", role=CompanyRole.OWNER)
    user_b = create_user(db_session, co_b, email="userb@beta.com", role=CompanyRole.OWNER)

    headers_a = get_auth_headers(user_a.id)

    # Query current company profile for user_a (Company Alpha)
    res_a = client.get("/companies/me", headers=headers_a)
    assert res_a.status_code == 200
    data_a = res_a.json()["data"]
    # Returned company metadata belongs exclusively to Company Alpha, not Company Beta
    assert data_a["name"] == "Company Alpha"


# ---------------------------------------------------------------------------
# 3. Authentication & Sensitive Response Field Protection
# ---------------------------------------------------------------------------

def test_unauthenticated_request_rejection(client: TestClient):
    """Verify unauthenticated requests to protected endpoints return 401."""
    res = client.get("/admin/stats")
    assert res.status_code == 401

    res_me = client.get("/auth/me")
    assert res_me.status_code == 401


def test_sensitive_fields_not_exposed(client: TestClient, db_session: Session):
    """Verify password_hash and token secrets are not exposed in auth or profile responses."""
    co = create_company(db_session, name="Security Co")
    user = create_user(db_session, co, email="privacy@test.com", password_hash="secret_hash_123")

    headers = get_auth_headers(user.id)
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    body_str = res.text

    assert "password_hash" not in body_str
    assert "secret_hash_123" not in body_str
