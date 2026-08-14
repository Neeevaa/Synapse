import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, SubscriptionPlan, CompanyStatus
from app.models.company import Company
from app.models.user import User
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project, add_project_member


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_admin_endpoints_super_admin_success(client: TestClient, db_session: Session):
    # Setup Super Admin user
    super_admin = User(
        email="superadmin_test@admin.com",
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

    # Setup Company 1 with users, projects, tasks
    company1 = create_company(db_session, name="Company One", slug="company-one-test")
    user1 = create_user(db_session, company1, email="c1_u1_test@test.com", role=CompanyRole.OWNER)
    user2 = create_user(db_session, company1, email="c1_u2_test@test.com", role=None)
    proj1 = create_project(db_session, company1, name="Project C1 Secret")

    # Add task to proj1
    res_task = client.post(
        f"/projects/{proj1.id}/tasks",
        json={"title": "Secret Task C1"},
        headers=get_auth_headers(user1.id),
    )
    assert res_task.status_code == 201

    # Setup Company 2
    company2 = create_company(db_session, name="Company Two", slug="company-two-test")
    user3 = create_user(db_session, company2, email="c2_u1_test@test.com", role=CompanyRole.OWNER)

    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    # 1. Platform-wide stats
    res_stats = client.get("/admin/stats", headers=admin_headers)
    assert res_stats.status_code == 200, res_stats.text
    stats = res_stats.json()["data"]
    assert stats["total_companies"] >= 2
    assert stats["total_users"] >= 3
    assert stats["total_projects"] >= 1
    assert stats["total_tasks"] >= 1

    # 2. List companies with stats
    res_list = client.get("/admin/companies?page=1&limit=10", headers=admin_headers)
    assert res_list.status_code == 200, res_list.text
    list_data = res_list.json()["data"]
    assert list_data["total"] >= 2
    c1_item = next(c for c in list_data["companies"] if c["id"] == str(company1.id))
    assert c1_item["user_count"] == 2
    assert c1_item["project_count"] == 1
    assert c1_item["task_count"] == 1
    assert c1_item["is_active"] is True

    # 3. Get single company detail
    res_detail = client.get(f"/admin/companies/{company1.id}", headers=admin_headers)
    assert res_detail.status_code == 200, res_detail.text
    detail = res_detail.json()["data"]
    assert detail["name"] == "Company One"
    assert detail["user_count"] == 2

    # 4. Patch company: update plan to ENTERPRISE
    res_patch_plan = client.patch(
        f"/admin/companies/{company1.id}",
        json={"subscription_plan": "ENTERPRISE", "reason": "Upgraded tier"},
        headers=admin_headers,
    )
    assert res_patch_plan.status_code == 200, res_patch_plan.text
    assert res_patch_plan.json()["data"]["subscription_plan"] == "ENTERPRISE"

    # 5. Patch company: suspend company (is_active = False)
    res_patch_active = client.patch(
        f"/admin/companies/{company1.id}",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert res_patch_active.status_code == 200, res_patch_active.text
    assert res_patch_active.json()["data"]["is_active"] is False


def test_admin_endpoints_non_super_admin_rejection(client: TestClient, db_session: Session):
    company = create_company(db_session, name="NonAdmin Co", slug="non-admin-co-test")
    owner = create_user(db_session, company, email="owner_rejection_test@test.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev_rejection_test@test.com", role=None)

    owner_headers = get_auth_headers(owner.id)
    dev_headers = get_auth_headers(dev.id)

    admin_urls = [
        ("GET", "/admin/stats"),
        ("GET", "/admin/companies"),
        ("GET", "/admin/companies/pending"),
        ("GET", f"/admin/companies/{company.id}"),
        ("GET", f"/admin/companies/{company.id}/users/summary"),
        ("GET", f"/admin/companies/{company.id}/usage"),
        ("GET", "/admin/audit-logs"),
        ("PATCH", f"/admin/companies/{company.id}"),
        ("PATCH", f"/admin/companies/{company.id}/approve"),
        ("PATCH", f"/admin/companies/{company.id}/reject"),
        ("PATCH", f"/admin/companies/{company.id}/suspend"),
        ("PATCH", f"/admin/companies/{company.id}/reactivate"),
        ("PATCH", f"/admin/companies/{company.id}/deactivate"),
    ]

    for method, url in admin_urls:
        if method == "GET":
            res_owner = client.get(url, headers=owner_headers)
            res_dev = client.get(url, headers=dev_headers)
        elif method == "PATCH":
            res_owner = client.patch(url, json={}, headers=owner_headers)
            res_dev = client.patch(url, json={}, headers=dev_headers)

        assert res_owner.status_code == 403, f"{method} {url} for Owner expected 403, got {res_owner.status_code}"
        assert res_dev.status_code == 403, f"{method} {url} for Dev expected 403, got {res_dev.status_code}"


def test_company_lifecycle_transitions(client: TestClient, db_session: Session):
    super_admin = User(
        email="lifecycle_admin@admin.com",
        password_hash="hashed_password",
        first_name="Admin",
        last_name="Super",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
        is_active=True,
    )
    db_session.add(super_admin)

    # Create pending company
    pending_co = Company(
        name="Pending Startup",
        slug="pending-startup",
        status=CompanyStatus.PENDING_APPROVAL,
        is_active=False,
    )
    db_session.add(pending_co)
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    # 1. GET /admin/companies/pending
    res_pending = client.get("/admin/companies/pending", headers=admin_headers)
    assert res_pending.status_code == 200
    pending_list = res_pending.json()["data"]["companies"]
    assert any(c["id"] == str(pending_co.id) for c in pending_list)

    # 2. Reject pending company -> REJECTED
    res_reject = client.patch(
        f"/admin/companies/{pending_co.id}/reject",
        json={"reason": "Incomplete registration info"},
        headers=admin_headers,
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["data"]["status"] == "REJECTED"

    # 3. Invalid transition: Rejecting an already REJECTED company -> 400
    res_invalid_reject = client.patch(
        f"/admin/companies/{pending_co.id}/reject",
        json={},
        headers=admin_headers,
    )
    assert res_invalid_reject.status_code == 400

    # 4. Approve company -> ACTIVE
    res_approve = client.patch(
        f"/admin/companies/{pending_co.id}/approve",
        json={"reason": "Manually verified"},
        headers=admin_headers,
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["data"]["status"] == "ACTIVE"
    assert res_approve.json()["data"]["is_active"] is True

    # 5. Invalid transition: Approving an already ACTIVE company -> 400
    res_invalid_approve = client.patch(
        f"/admin/companies/{pending_co.id}/approve",
        json={},
        headers=admin_headers,
    )
    assert res_invalid_approve.status_code == 400

    # 6. Suspend company -> SUSPENDED
    res_suspend = client.patch(
        f"/admin/companies/{pending_co.id}/suspend",
        json={"reason": "Terms violation"},
        headers=admin_headers,
    )
    assert res_suspend.status_code == 200
    assert res_suspend.json()["data"]["status"] == "SUSPENDED"
    assert res_suspend.json()["data"]["is_active"] is False

    # 7. Reactivate company -> ACTIVE
    res_reactivate = client.patch(
        f"/admin/companies/{pending_co.id}/reactivate",
        json={"reason": "Compliance resolved"},
        headers=admin_headers,
    )
    assert res_reactivate.status_code == 200
    assert res_reactivate.json()["data"]["status"] == "ACTIVE"
    assert res_reactivate.json()["data"]["is_active"] is True

    # 8. Deactivate company -> DEACTIVATED
    res_deactivate = client.patch(
        f"/admin/companies/{pending_co.id}/deactivate",
        json={"reason": "Customer request"},
        headers=admin_headers,
    )
    assert res_deactivate.status_code == 200
    assert res_deactivate.json()["data"]["status"] == "DEACTIVATED"
    assert res_deactivate.json()["data"]["is_active"] is False

    # 9. Company Not Found -> 404
    fake_id = uuid.uuid4()
    res_not_found = client.patch(f"/admin/companies/{fake_id}/approve", headers=admin_headers)
    assert res_not_found.status_code == 404


def test_user_summary_and_resource_usage(client: TestClient, db_session: Session):
    super_admin = User(
        email="usage_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    company = create_company(db_session, name="Metrics Corp", slug="metrics-corp")
    user1 = create_user(db_session, company, email="m_owner@test.com", role=CompanyRole.OWNER)
    user2 = create_user(db_session, company, email="m_dev@test.com", role=None)
    proj = create_project(db_session, company, name="Metrics Project")
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    # User Summary
    res_user_sum = client.get(f"/admin/companies/{company.id}/users/summary", headers=admin_headers)
    assert res_user_sum.status_code == 200
    u_sum = res_user_sum.json()["data"]
    assert u_sum["total_users"] == 2
    assert u_sum["active_users"] == 2
    assert u_sum["users_by_company_role"]["OWNER"] == 1

    # Resource Usage
    res_usage = client.get(f"/admin/companies/{company.id}/usage", headers=admin_headers)
    assert res_usage.status_code == 200
    usage = res_usage.json()["data"]
    assert usage["total_projects"] == 1
    assert usage["active_projects"] == 1
    assert usage["total_users"] == 2
    assert "storage_limit" in usage


def test_audit_logs_and_privacy_boundaries(client: TestClient, db_session: Session):
    super_admin = User(
        email="audit_admin@admin.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        company_id=None,
        is_super_admin=True,
        is_verified=True,
    )
    db_session.add(super_admin)

    company = create_company(db_session, name="Secret Co", slug="secret-co")
    user1 = create_user(db_session, company, email="secret_owner@test.com", role=CompanyRole.OWNER)
    proj = create_project(db_session, company, name="Top Secret Quantum Algorithm")

    client.post(
        f"/projects/{proj.id}/tasks",
        json={"title": "Confidential Encryption Keys Task", "description": "Private project data"},
        headers=get_auth_headers(user1.id),
    )
    db_session.commit()

    admin_headers = get_auth_headers(super_admin.id)

    # Perform action to create audit log
    client.patch(
        f"/admin/companies/{company.id}",
        json={"subscription_plan": "PRO", "reason": "Upgrade audit test"},
        headers=admin_headers,
    )

    # Fetch audit logs
    res_logs = client.get("/admin/audit-logs", headers=admin_headers)
    assert res_logs.status_code == 200
    log_data = res_logs.json()["data"]
    assert log_data["total"] >= 1
    recent_log = log_data["logs"][0]
    assert recent_log["action"] == "SUBSCRIPTION_CHANGED"

    # Filter audit logs by company
    res_logs_filtered = client.get(f"/admin/audit-logs?company_id={company.id}", headers=admin_headers)
    assert res_logs_filtered.status_code == 200
    assert len(res_logs_filtered.json()["data"]["logs"]) >= 1

    # Privacy Boundary Verification: assert response payload DOES NOT expose confidential names or titles
    res_company_detail = client.get(f"/admin/companies/{company.id}", headers=admin_headers)
    res_company_usage = client.get(f"/admin/companies/{company.id}/usage", headers=admin_headers)

    detail_str = str(res_company_detail.json())
    usage_str = str(res_company_usage.json())
    logs_str = str(res_logs.json())

    assert "Top Secret Quantum Algorithm" not in detail_str
    assert "Confidential Encryption Keys Task" not in detail_str
    assert "Top Secret Quantum Algorithm" not in usage_str
    assert "Confidential Encryption Keys Task" not in usage_str
    assert "Confidential Encryption Keys Task" not in logs_str
