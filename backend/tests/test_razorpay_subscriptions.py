import hashlib
import hmac
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plans import PLAN_DEFINITIONS
from app.core.security import create_access_token
from app.models.enums import CompanyRole, SubscriptionPlan
from app.models.subscription import Payment, PaymentOrder, Subscription
from app.subscriptions.service import EntitlementService
from tests.conftest import create_company, create_user


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_razorpay_env(monkeypatch):
    """Ensure Razorpay test mode credentials exist for tests."""
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_mockKeyId123")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "mockSecretKey987654321")
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "mockWebhookSecret123")


def test_cto_can_retrieve_plans(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Plans Co")
    owner = create_user(db_session, company, email="owner_plans@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    res = client.get("/subscriptions/plans", headers=headers)
    assert res.status_code == 200, res.text
    plans = res.json()["data"]["plans"]
    assert len(plans) == 4

    plan_map = {p["code"]: p for p in plans}
    assert "FREE" in plan_map
    assert "STARTER" in plan_map
    assert "PRO" in plan_map
    assert "ENTERPRISE" in plan_map

    assert plan_map["FREE"]["price"] == 0
    assert plan_map["FREE"]["currency"] == "INR"
    assert plan_map["STARTER"]["price"] == 799
    assert plan_map["PRO"]["price"] == 1999
    assert plan_map["PRO"]["price_display"] == "₹1,999 / month"
    assert plan_map["PRO"]["is_popular"] is True


def test_cto_can_retrieve_current_subscription(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Sub Co")
    owner = create_user(db_session, company, email="owner_sub@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    res = client.get("/subscriptions/current", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["company_name"] == "Sub Co"
    assert data["plan"] == "FREE"
    assert data["status"] == "ACTIVE"
    assert data["limits"]["max_team_members"] == 3


def test_non_cto_user_cannot_access_sensitive_billing(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Dev Co")
    dev = create_user(db_session, company, email="dev@test.com", role=None)
    dev_headers = get_auth_headers(dev.id)

    # 1. GET /subscriptions/current -> 403
    res_get = client.get("/subscriptions/current", headers=dev_headers)
    assert res_get.status_code == 403
    assert "Only the Organization CTO / Owner" in res_get.json()["message"]

    # 2. POST /subscriptions/create-order -> 403
    res_order = client.post("/subscriptions/create-order", json={"plan": "PRO"}, headers=dev_headers)
    assert res_order.status_code == 403

    # 3. POST /subscriptions/verify-payment -> 403
    res_verify = client.post(
        "/subscriptions/verify-payment",
        json={
            "razorpay_payment_id": "pay_fake",
            "razorpay_order_id": "order_fake",
            "razorpay_signature": "sig_fake",
        },
        headers=dev_headers,
    )
    assert res_verify.status_code == 403


def test_cto_can_create_paid_order_with_authoritative_price(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Order Co")
    owner = create_user(db_session, company, email="owner_order@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    with patch("razorpay.Client") as mock_rzp:
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {"id": "order_test_pro_12345"}
        mock_rzp.return_value = mock_instance

        # Even if a malicious frontend attempts to send a fake "amount", it is ignored
        payload = {"plan": "PRO", "amount": 500}
        res = client.post("/subscriptions/create-order", json=payload, headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]

        assert data["order_id"] == "order_test_pro_12345"
        assert data["plan"] == "PRO"
        # Must be exactly 199900 paise (authoritative)
        assert data["amount"] == 199900
        assert data["currency"] == "INR"

        # Verify order in DB
        db_order = db_session.query(PaymentOrder).filter_by(razorpay_order_id="order_test_pro_12345").first()
        assert db_order is not None
        assert db_order.amount == 199900
        assert db_order.plan == SubscriptionPlan.PRO
        assert db_order.status == "CREATED"


def test_free_plan_rejects_order_creation_and_uses_free_activation(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Free Order Co")
    owner = create_user(db_session, company, email="owner_free@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    # 1. create-order for FREE must fail (no ₹0 fake Razorpay order)
    res_fail = client.post("/subscriptions/create-order", json={"plan": "FREE"}, headers=headers)
    assert res_fail.status_code == 400
    assert "Free plan does not require payment" in res_fail.json()["message"]

    # 2. Free activation endpoint activates immediately
    res_free = client.post("/subscriptions/free", json={"plan": "FREE"}, headers=headers)
    assert res_free.status_code == 200
    assert res_free.json()["data"]["plan"] == "FREE"
    assert res_free.json()["data"]["status"] == "ACTIVE"


def test_valid_razorpay_signature_activates_paid_plan_and_updates_limits(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Verify Co")
    owner = create_user(db_session, company, email="owner_verify@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    # Pre-create payment order for PRO (199900 paise)
    order_id = "order_rzp_pro_9999"
    payment_order = PaymentOrder(
        company_id=company.id,
        user_id=owner.id,
        plan=SubscriptionPlan.PRO,
        razorpay_order_id=order_id,
        amount=199900,
        currency="INR",
        status="CREATED",
    )
    db_session.add(payment_order)
    db_session.commit()

    # Generate valid HMAC signature
    payment_id = "pay_rzp_test_7777"
    secret = settings.RAZORPAY_KEY_SECRET
    message = f"{order_id}|{payment_id}"
    valid_signature = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()

    verify_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_signature,
    }

    res = client.post("/subscriptions/verify-payment", json=verify_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["success"] is True
    assert data["plan"] == "PRO"
    assert data["status"] == "ACTIVE"
    assert data["current_period_end"] is not None

    # Check Company subscription_plan updated to PRO
    db_session.refresh(company)
    assert company.subscription_plan == SubscriptionPlan.PRO

    # Check PaymentOrder updated to PAID
    db_session.refresh(payment_order)
    assert payment_order.status == "PAID"

    # Check Payment record created
    payment = db_session.query(Payment).filter_by(razorpay_payment_id=payment_id).first()
    assert payment is not None
    assert payment.amount == 199900
    assert payment.status == "SUCCESS"

    # Verify EntitlementService immediately grants PRO limits
    ent_service = EntitlementService(db_session)
    effective = ent_service.get_effective_entitlements(company.id)
    assert effective.plan == SubscriptionPlan.PRO
    assert effective.max_users == 50
    assert effective.max_active_projects == -1  # Unlimited!
    assert effective.max_ai_executions == -1  # Unlimited!


def test_invalid_signature_rejects_plan_activation(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Bad Sig Co")
    owner = create_user(db_session, company, email="owner_badsig@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    order_id = "order_bad_sig_123"
    payment_order = PaymentOrder(
        company_id=company.id,
        user_id=owner.id,
        plan=SubscriptionPlan.PRO,
        razorpay_order_id=order_id,
        amount=199900,
        currency="INR",
        status="CREATED",
    )
    db_session.add(payment_order)
    db_session.commit()

    invalid_payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": "pay_bad_456",
        "razorpay_signature": "forged_signature_hex_value",
    }

    res = client.post("/subscriptions/verify-payment", json=invalid_payload, headers=headers)
    assert res.status_code == 400
    assert "invalid cryptographic signature" in res.json()["message"].lower()

    # Ensure plan is NOT changed
    db_session.refresh(company)
    assert company.subscription_plan == SubscriptionPlan.FREE

    # Ensure order is not marked paid
    db_session.refresh(payment_order)
    assert payment_order.status == "CREATED"


def test_duplicate_verification_is_idempotent(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Idempotent Co")
    owner = create_user(db_session, company, email="owner_idem@test.com", role=CompanyRole.OWNER)
    headers = get_auth_headers(owner.id)

    order_id = "order_idem_100"
    payment_id = "pay_idem_200"

    payment_order = PaymentOrder(
        company_id=company.id,
        user_id=owner.id,
        plan=SubscriptionPlan.PRO,
        razorpay_order_id=order_id,
        amount=199900,
        currency="INR",
        status="CREATED",
    )
    db_session.add(payment_order)
    db_session.commit()

    message = f"{order_id}|{payment_id}"
    valid_sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()

    payload = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": valid_sig,
    }

    # First call -> success
    res1 = client.post("/subscriptions/verify-payment", json=payload, headers=headers)
    assert res1.status_code == 200

    # Second call (replay) -> also success, returns existing state, does NOT duplicate
    res2 = client.post("/subscriptions/verify-payment", json=payload, headers=headers)
    assert res2.status_code == 200
    assert "already processed" in res2.json()["data"]["message"].lower()

    # Exactly 1 payment row must exist
    payment_count = db_session.query(Payment).filter_by(razorpay_payment_id=payment_id).count()
    assert payment_count == 1


def test_cross_tenant_verification_rejected(client: TestClient, db_session: Session):
    company_a = create_company(db_session, name="Tenant A")
    owner_a = create_user(db_session, company_a, email="owner_a@test.com", role=CompanyRole.OWNER)

    company_b = create_company(db_session, name="Tenant B")
    owner_b = create_user(db_session, company_b, email="owner_b@test.com", role=CompanyRole.OWNER)

    # Order belongs to Company B
    order_id = "order_tenant_b_1"
    payment_order_b = PaymentOrder(
        company_id=company_b.id,
        user_id=owner_b.id,
        plan=SubscriptionPlan.PRO,
        razorpay_order_id=order_id,
        amount=199900,
        currency="INR",
        status="CREATED",
    )
    db_session.add(payment_order_b)
    db_session.commit()

    payment_id = "pay_tenant_b_1"
    message = f"{order_id}|{payment_id}"
    valid_sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()

    # Owner A tries to verify Order B -> rejected!
    headers_a = get_auth_headers(owner_a.id)
    res = client.post(
        "/subscriptions/verify-payment",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=headers_a,
    )
    assert res.status_code == 403
    assert "does not belong to your organization" in res.json()["message"]


def test_webhook_with_valid_signature_updates_order(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Webhook Co")
    owner = create_user(db_session, company, email="owner_wh@test.com", role=CompanyRole.OWNER)

    order_id = "order_wh_123"
    payment_order = PaymentOrder(
        company_id=company.id,
        user_id=owner.id,
        plan=SubscriptionPlan.PRO,
        razorpay_order_id=order_id,
        amount=199900,
        currency="INR",
        status="CREATED",
    )
    db_session.add(payment_order)
    db_session.commit()

    import json
    payload_dict = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_wh_captured_999",
                    "order_id": order_id,
                    "amount": 199900,
                    "status": "captured",
                }
            }
        }
    }
    payload_bytes = json.dumps(payload_dict).encode("utf-8")
    sig = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

    res = client.post(
        "/payments/webhook/razorpay",
        content=payload_bytes,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["event"] == "payment.captured"

    db_session.refresh(payment_order)
    assert payment_order.status == "PAID"
