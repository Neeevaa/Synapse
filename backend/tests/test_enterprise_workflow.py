"""
Integration and unit test suite for the Enterprise Custom Subscription workflow.
Tests end-to-end CTO request submission, Super Admin review & dynamic pricing,
approval snapshot immutability, payment enforcement, activation, and entitlement allocation.
"""
import hashlib
import hmac
from unittest.mock import MagicMock, patch
from uuid import UUID
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models.enums import CompanyRole, EnterpriseRequestStatus, NotificationType, SubscriptionPlan
from app.models.company_resource import CompanyResourceAllocation
from app.models.subscription import EnterpriseSubscriptionRequest, Payment, PaymentOrder
from app.models.notification import Notification
from app.subscriptions.service import EntitlementService
from app.subscriptions.enterprise_pricing import calculate_enterprise_pricing
from tests.conftest import create_company, create_user


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_razorpay_env(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_mockKeyId123")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "mockSecretKey987654321")
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "mockWebhookSecret123")


def test_authoritative_pricing_engine():
    """Verify that backend enterprise pricing calculates deterministic itemized breakdown."""
    pricing = calculate_enterprise_pricing(
        limits={
            "max_users": 50,
            "max_active_projects": 30,
            "max_storage_gb": 100,
            "max_ai_executions": 5000,
            "max_automation_workflows": 50,
        },
        capabilities=["AI Agents", "Project Knowledge Search", "Enterprise SSO & SAML 2.0"],
    )
    assert pricing["base_fee"] == 5000
    assert pricing["total_monthly_price"] >= 5000
    assert len(pricing["capabilities_items"]) == 3


def test_cto_can_submit_enterprise_request(client: TestClient, db_session: Session):
    """CTO submits an enterprise request; it is stored as PENDING and dispatches notification."""
    company = create_company(db_session, name="Enterprise Alpha Corp")
    owner = create_user(db_session, company, email="cto_alpha@test.com", role=CompanyRole.OWNER)
    # Create a super admin to verify notification reception
    admin_comp = create_company(db_session, name="Admin HQ")
    super_admin = create_user(db_session, admin_comp, email="sadmin@synapse.io", role=CompanyRole.ADMIN)
    super_admin.is_super_admin = True
    db_session.commit()

    headers = get_auth_headers(owner.id)
    payload = {
        "requested_resources": {
            "max_users": 100,
            "max_projects": 50,
            "max_storage_bytes": 200 * 1024 * 1024 * 1024,
            "max_ai_executions": 10000,
            "max_automation_workflows": 100,
        },
        "requested_capabilities": ["ai_agents", "knowledge_graph", "sso_saml"],
        "business_justification": "Scale for 100 enterprise engineers.",
    }

    res = client.post("/subscriptions/enterprise-request", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["status"] == "PENDING"
    assert data["company_id"] == str(company.id)
    assert data["requested_capabilities"] == ["ai_agents", "knowledge_graph", "sso_saml"]

    # Verify notification to super admin was created
    notif = db_session.query(Notification).filter_by(
        recipient_user_id=super_admin.id,
        type=NotificationType.ENTERPRISE_REQUEST_SUBMITTED,
    ).first()
    assert notif is not None
    assert "Enterprise Alpha Corp" in notif.message


def test_non_owner_forbidden_from_submitting_enterprise_request(client: TestClient, db_session: Session):
    """Non-owner members receive 403 Forbidden when trying to submit enterprise request."""
    company = create_company(db_session, name="Dev Group")
    member = create_user(db_session, company, email="dev@test.com", role=CompanyRole.MEMBER)
    headers = get_auth_headers(member.id)

    res = client.post(
        "/subscriptions/enterprise-request",
        json={
            "requested_resources": {"max_users": 50},
            "requested_capabilities": ["ai_agents"],
        },
        headers=headers,
    )
    assert res.status_code == 403
    detail = res.json().get("detail") or res.json().get("message", "")
    assert "Only the Organization CTO / Owner" in detail


def test_duplicate_active_enterprise_request_is_prevented(client: TestClient, db_session: Session):
    """Attempting to submit another request while one is active returns 400 Bad Request."""
    company = create_company(db_session, name="Dup Co")
    owner = create_user(db_session, company, email="dup_owner@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    payload = {
        "requested_resources": {"max_users": 50},
        "requested_capabilities": ["ai_agents"],
    }
    res1 = client.post("/subscriptions/enterprise-request", json=payload, headers=headers)
    assert res1.status_code == 201

    res2 = client.post("/subscriptions/enterprise-request", json=payload, headers=headers)
    assert res2.status_code == 400
    msg = res2.json().get("detail") or res2.json().get("message", "")
    assert "active Enterprise subscription request already exists" in msg


def test_super_admin_review_calculate_price_and_approve(client: TestClient, db_session: Session):
    """Super Admin reviews request, calculates preview, approves with adjustments, creating permanent snapshot."""
    company = create_company(db_session, name="Big Org")
    owner = create_user(db_session, company, email="big_cto@test.com", role=CompanyRole.OWNER)

    super_admin = create_user(db_session, company, email="super_eval@test.com", role=CompanyRole.ADMIN)
    super_admin.is_super_admin = True
    db_session.commit()

    owner_headers = get_auth_headers(owner.id)
    admin_headers = get_auth_headers(super_admin.id)

    # 1. CTO creates request
    create_res = client.post(
        "/subscriptions/enterprise-request",
        json={
            "requested_resources": {
                "max_users": 50,
                "max_projects": 20,
                "max_storage_bytes": 50 * 1024 * 1024 * 1024,
                "max_ai_executions": 2000,
                "max_automation_workflows": 20,
            },
            "requested_capabilities": ["ai_agents", "knowledge_search"],
        },
        headers=owner_headers,
    )
    assert create_res.status_code == 201
    request_id = create_res.json()["data"]["id"]

    # 2. Super Admin lists requests
    list_res = client.get("/admin/enterprise-requests", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(r["id"] == request_id for r in list_res.json()["data"]["items"])

    # 3. Super Admin gets single request
    get_res = client.get(f"/admin/enterprise-requests/{request_id}", headers=admin_headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["status"] == "PENDING"

    # 4. Super Admin calculates dynamic preview price
    calc_res = client.post(
        "/admin/enterprise-requests/calculate-price",
        json={
            "resources": {"max_users": 80, "max_projects": 40},
            "capabilities": ["ai_agents", "sso_saml"],
        },
        headers=admin_headers,
    )
    assert calc_res.status_code == 200
    assert calc_res.json()["data"]["total_monthly_price"] > 5000

    # 5. Super Admin approves with adjustments
    approve_res = client.post(
        f"/admin/enterprise-requests/{request_id}/approve",
        json={
            "approved_resources": {
                "max_users": 80,
                "max_projects": 40,
                "max_storage_bytes": 100 * 1024 * 1024 * 1024,
                "max_ai_executions": 5000,
                "max_automation_workflows": 50,
            },
            "approved_capabilities": ["ai_agents", "sso_saml"],
            "admin_notes": "Approved for 80 seats with SSO included.",
        },
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    appr_data = approve_res.json()["data"]
    assert appr_data["status"] == "PAYMENT_PENDING"
    assert appr_data["calculated_price"] > 5000
    assert appr_data["pricing_version"] == "v1.0"
    assert appr_data["approved_at"] is not None
    assert appr_data["approved_resources"]["max_users"] == 80

    # Verify CTO received notification
    cto_notif = db_session.query(Notification).filter_by(
        recipient_user_id=owner.id,
        type=NotificationType.ENTERPRISE_REQUEST_APPROVED,
    ).first()
    assert cto_notif is not None
    assert "approved" in cto_notif.message.lower()


def test_cto_cannot_order_enterprise_when_pending(client: TestClient, db_session: Session):
    """CTO cannot initiate payment order for ENTERPRISE while request is still PENDING."""
    company = create_company(db_session, name="Pending Plan Co")
    owner = create_user(db_session, company, email="pending_cto@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    # Submit request (still PENDING)
    client.post(
        "/subscriptions/enterprise-request",
        json={
            "requested_resources": {"max_users": 50},
            "requested_capabilities": ["ai_agents"],
        },
        headers=headers,
    )

    # Attempt to create payment order -> should fail with 400
    order_res = client.post(
        "/subscriptions/create-order",
        json={"plan": "ENTERPRISE"},
        headers=headers,
    )
    assert order_res.status_code == 400
    assert "requires an approved custom request" in order_res.json()["message"]


def test_enterprise_payment_verification_and_activation(client: TestClient, db_session: Session):
    """When CTO pays for approved Enterprise plan, subscription becomes ENTERPRISE and resources are allocated."""
    company = create_company(db_session, name="Activation Corp")
    owner = create_user(db_session, company, email="activation_cto@test.com", role=CompanyRole.OWNER)
    super_admin = create_user(db_session, company, email="sadmin_act@test.com", role=CompanyRole.ADMIN)
    super_admin.is_super_admin = True
    db_session.commit()

    owner_headers = get_auth_headers(owner.id)
    admin_headers = get_auth_headers(super_admin.id)

    # 1. CTO submits request
    req_res = client.post(
        "/subscriptions/enterprise-request",
        json={
            "requested_resources": {
                "max_users": 150,
                "max_projects": 75,
                "max_storage_bytes": 300 * 1024 * 1024 * 1024,
                "max_ai_executions": 20000,
                "max_automation_workflows": 150,
            },
            "requested_capabilities": ["ai_agents", "sso_saml", "api_access"],
        },
        headers=owner_headers,
    )
    assert req_res.status_code == 201
    request_id = req_res.json()["data"]["id"]

    # 2. Super Admin approves request
    appr_res = client.post(
        f"/admin/enterprise-requests/{request_id}/approve",
        json={
            "approved_resources": {
                "max_users": 150,
                "max_projects": 75,
                "max_storage_bytes": 300 * 1024 * 1024 * 1024,
                "max_ai_executions": 20000,
                "max_automation_workflows": 150,
            },
            "approved_capabilities": ["ai_agents", "sso_saml", "api_access"],
        },
        headers=admin_headers,
    )
    assert appr_res.status_code == 200
    approved_price = appr_res.json()["data"]["calculated_price"]

    # 3. CTO creates payment order for ENTERPRISE
    with patch("razorpay.Client") as mock_rzp:
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {
            "id": "order_mockEnterprise123",
            "amount": approved_price * 100,
            "currency": "INR",
            "status": "created",
        }
        mock_rzp.return_value = mock_instance

        order_res = client.post(
            "/subscriptions/create-order",
            json={"plan": "ENTERPRISE"},
            headers=owner_headers,
        )
        assert order_res.status_code == 200, order_res.text
        order_data = order_res.json()["data"]
        assert order_data["amount"] == approved_price * 100
        assert order_data["order_id"] == "order_mockEnterprise123"

    # 4. CTO verifies payment
    order_id = "order_mockEnterprise123"
    payment_id = "pay_mockEnterpriseVerification456"
    expected_sig = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg=f"{order_id}|{payment_id}".encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    verify_res = client.post(
        "/subscriptions/verify-payment",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": expected_sig,
        },
        headers=owner_headers,
    )
    assert verify_res.status_code == 200, verify_res.text
    assert verify_res.json()["data"]["plan"] == "ENTERPRISE"

    # 5. Verify database state
    db_session.refresh(company)
    assert company.subscription_plan == SubscriptionPlan.ENTERPRISE

    # Verify request is ACTIVATED
    ent_req = db_session.query(EnterpriseSubscriptionRequest).filter_by(id=UUID(request_id)).first()
    assert ent_req.status == EnterpriseRequestStatus.ACTIVATED

    # Verify CompanyResourceAllocation has custom quotas
    alloc = db_session.query(CompanyResourceAllocation).filter_by(company_id=company.id).first()
    assert alloc is not None
    assert alloc.custom_max_users == 150
    assert alloc.custom_max_projects == 75
    assert alloc.custom_max_storage_bytes == 300 * 1024 * 1024 * 1024
    assert alloc.custom_max_ai_executions == 20000
    assert alloc.custom_max_automation_workflows == 150
    assert "ai_agents" in alloc.custom_features

    # 6. Verify EntitlementService enforces the custom enterprise quotas
    entitlements = EntitlementService(db_session).get_effective_entitlements(company.id)
    assert entitlements.max_users == 150
    assert entitlements.max_active_projects == 75
    assert entitlements.max_storage_bytes == 300 * 1024 * 1024 * 1024
    assert entitlements.max_ai_executions == 20000
    assert entitlements.max_automation_workflows == 150
    assert "ai_agents" in entitlements.enabled_features
    assert "sso_saml" in entitlements.enabled_features


def test_super_admin_can_reject_enterprise_request(client: TestClient, db_session: Session):
    """Super Admin can reject request with a customer-facing reason."""
    company = create_company(db_session, name="Reject Co")
    owner = create_user(db_session, company, email="reject_cto@test.com", role=CompanyRole.OWNER)
    super_admin = create_user(db_session, company, email="sadmin_rej@test.com", role=CompanyRole.ADMIN)
    super_admin.is_super_admin = True
    db_session.commit()

    owner_headers = get_auth_headers(owner.id)
    admin_headers = get_auth_headers(super_admin.id)

    # CTO creates request
    req_res = client.post(
        "/subscriptions/enterprise-request",
        json={"requested_resources": {"max_users": 500}, "requested_capabilities": ["ai_agents"]},
        headers=owner_headers,
    )
    assert req_res.status_code == 201
    request_id = req_res.json()["data"]["id"]

    # Super Admin rejects request
    rej_res = client.post(
        f"/admin/enterprise-requests/{request_id}/reject",
        json={"reason": "Capacity limits cannot be fulfilled for 500 seats at this time."},
        headers=admin_headers,
    )
    assert rej_res.status_code == 200
    data = rej_res.json()["data"]
    assert data["status"] == "REJECTED"
    assert "cannot be fulfilled" in data["rejection_reason"]

    # Verify rejection notification sent to CTO
    cto_notif = db_session.query(Notification).filter_by(
        recipient_user_id=owner.id,
        type=NotificationType.ENTERPRISE_REQUEST_REJECTED,
    ).first()
    assert cto_notif is not None
    assert "cannot be fulfilled" in cto_notif.message


def test_registration_with_enterprise_creates_pending_request_atomically(client: TestClient, db_session: Session):
    """Registration with subscription_plan=ENTERPRISE creates Company, Owner, and EnterpriseRequest atomically."""
    # Ensure super admin exists for notification dispatch
    admin_comp = create_company(db_session, name="Global Admin Co")
    sadmin = create_user(db_session, admin_comp, email="global_sa@test.com", role=CompanyRole.ADMIN)
    sadmin.is_super_admin = True
    db_session.commit()

    reg_payload = {
        "company_name": "New Horizons Enterprise",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada.enterprise@lovelace.io",
        "password": "SecurePassword123!",
        "subscription_plan": "ENTERPRISE",
        "enterprise_config": {
            "requested_resources": {
                "max_users": 200,
                "max_projects": 100,
                "max_storage_bytes": 500 * 1024 * 1024 * 1024,
                "max_ai_executions": 25000,
                "max_automation_workflows": 200,
            },
            "requested_capabilities": ["ai_agents", "knowledge_graph", "sso_saml"],
            "business_justification": "Onboarding 200 engineers across 5 global offices.",
        },
    }

    res = client.post("/auth/register", json=reg_payload)
    assert res.status_code == 201, res.text

    # Verify company was created with FREE default until Enterprise payment
    from app.models.company import Company
    comp = db_session.query(Company).filter_by(name="New Horizons Enterprise").first()
    assert comp is not None

    # Verify EnterpriseSubscriptionRequest was created in PENDING
    req = db_session.query(EnterpriseSubscriptionRequest).filter_by(company_id=comp.id).first()
    assert req is not None
    assert req.status == EnterpriseRequestStatus.PENDING
    assert req.requested_user_limit == 200
    assert "ai_agents" in req.requested_capabilities


def test_super_admin_notification_feed_and_deep_link(client: TestClient, db_session: Session):
    """
    Verifies that when an Enterprise request is submitted:
    1. Super Admin notification has the exact deep_link with request ID.
    2. Super Admin can query /notifications and see the notification across tenant boundaries.
    3. Normal organization members cannot access the Super Admin notification feed.
    4. Super Admin can mark the notification as read.
    """
    admin_comp = create_company(db_session, name="Platform HQ")
    super_admin = create_user(db_session, admin_comp, email="platform_sa@synapse.io", role=CompanyRole.ADMIN)
    super_admin.is_super_admin = True

    client_comp = create_company(db_session, name="Acme Aerospace")
    cto = create_user(db_session, client_comp, email="cto@acme-aero.io", role=CompanyRole.OWNER)
    dev_member = create_user(db_session, client_comp, email="dev@acme-aero.io", role=CompanyRole.MEMBER)
    db_session.commit()

    cto_headers = get_auth_headers(cto.id)
    sa_headers = get_auth_headers(super_admin.id)
    dev_headers = get_auth_headers(dev_member.id)

    # 1. CTO submits enterprise request
    sub_res = client.post(
        "/subscriptions/enterprise-request",
        json={
            "requested_resources": {"max_users": 150, "max_projects": 80},
            "requested_capabilities": ["ai_agents", "sso_saml"],
            "business_justification": "Air traffic simulation workloads.",
        },
        headers=cto_headers,
    )
    assert sub_res.status_code == 201
    req_id = sub_res.json()["data"]["id"]

    # 2. Super Admin queries /notifications
    sa_notif_res = client.get("/notifications", headers=sa_headers)
    assert sa_notif_res.status_code == 200
    sa_data = sa_notif_res.json()["data"]
    assert sa_data["unread_count"] >= 1

    # Find the notification in items
    all_notifs = sa_data.get("items", [])
    target_notif = next((n for n in all_notifs if n.get("source_id") == req_id), None)
    assert target_notif is not None, "Enterprise request notification not found in Super Admin feed"
    assert target_notif["type"] == NotificationType.ENTERPRISE_REQUEST_SUBMITTED.value
    assert target_notif["deep_link"] == f"/admin/enterprise-requests?id={req_id}"

    # 3. Super Admin unread count endpoint
    sa_count_res = client.get("/notifications/unread-count", headers=sa_headers)
    assert sa_count_res.status_code == 200
    assert sa_count_res.json()["data"]["unread_count"] >= 1

    # 4. Verify regular user in client_comp does NOT receive this Super Admin notification
    dev_notif_res = client.get("/notifications", headers=dev_headers)
    assert dev_notif_res.status_code == 200
    dev_data = dev_notif_res.json()["data"]
    dev_notifs = dev_data.get("items", [])
    assert not any(n.get("source_id") == req_id for n in dev_notifs)

    # 5. Super Admin marks notification as read
    patch_res = client.patch(f"/notifications/{target_notif['id']}/read", headers=sa_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["data"]["is_read"] is True

