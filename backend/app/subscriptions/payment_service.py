import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import razorpay
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.common.exceptions import BaseBusinessException, ResourceNotFound
from app.core.config import settings
from app.core.plans import PLAN_DEFINITIONS, get_authoritative_plan_price
from app.models.company import Company
from app.models.enums import CompanyRole, SubscriptionPlan, EnterpriseRequestStatus, NotificationType
from app.models.subscription import Payment, PaymentOrder, Subscription, EnterpriseSubscriptionRequest
from app.models.company_resource import CompanyResourceAllocation
from app.models.notification import Notification
from app.models.user import User
from app.subscriptions.enterprise_pricing import calculate_enterprise_pricing
from app.subscriptions.schemas import (
    AuthoritativePlanItem,
    CreateEnterpriseRequest,
    CreateOrderResponse,
    CurrentSubscriptionResponse,
    EnterpriseRequestDetail,
    PlansListResponse,
    RecentPaymentItem,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.subscriptions.service import EntitlementService

logger = logging.getLogger("app.subscriptions")


class SubscriptionPaymentService:
    def __init__(self, db: Session):
        self.db = db

    def _get_razorpay_client(self) -> razorpay.Client:
        key_id = settings.RAZORPAY_KEY_ID
        key_secret = settings.RAZORPAY_KEY_SECRET
        if not key_id or not key_secret:
            raise BaseBusinessException(
                "Razorpay credentials are not configured on the server. "
                "Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env.",
                status_code=500,
            )
        return razorpay.Client(auth=(key_id, key_secret))

    def get_available_plans(self) -> PlansListResponse:
        """Returns authoritative Synapse subscription plans with INR pricing and feature limits."""
        order = [
            SubscriptionPlan.FREE,
            SubscriptionPlan.STARTER,
            SubscriptionPlan.PRO,
            SubscriptionPlan.ENTERPRISE,
        ]
        plans = []
        for plan_enum in order:
            defn = PLAN_DEFINITIONS[plan_enum]
            plans.append(
                AuthoritativePlanItem(
                    code=defn.get("code", plan_enum.value),
                    name=defn["name"],
                    price=defn.get("price_inr"),
                    price_display=defn.get("price_display", defn["price"]),
                    currency=defn.get("currency", "INR"),
                    billing_period=defn.get("billing_period", "month"),
                    description=defn["description"],
                    cta_text=defn["cta_text"],
                    is_popular=defn.get("is_popular", False),
                    limits=defn["limits"],
                    included_features=defn["included_features"],
                    unavailable_features=defn["unavailable_features"],
                )
            )
        return PlansListResponse(plans=plans)

    def get_current_subscription(self, company_id: UUID) -> CurrentSubscriptionResponse:
        """
        Retrieves company's current active subscription, 30-day period status, and recent payments.
        """
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()
        if not company:
            raise ResourceNotFound("Company not found.")

        subscription = self.db.execute(
            select(Subscription).filter(Subscription.company_id == company_id)
        ).scalar_one_or_none()

        plan_enum = company.subscription_plan or SubscriptionPlan.FREE
        plan_defn = PLAN_DEFINITIONS.get(plan_enum, PLAN_DEFINITIONS[SubscriptionPlan.FREE])

        recent_payment_rows = self.db.execute(
            select(Payment)
            .filter(Payment.company_id == company_id)
            .order_by(desc(Payment.created_at))
            .limit(5)
        ).scalars().all()

        recent_payments = [
            RecentPaymentItem(
                id=p.id,
                razorpay_order_id=p.razorpay_order_id,
                razorpay_payment_id=p.razorpay_payment_id,
                amount=p.amount,
                amount_inr=p.amount / 100.0,
                currency=p.currency,
                status=p.status,
                created_at=p.created_at,
            )
            for p in recent_payment_rows
        ]

        # Entitlement warnings
        ent_service = EntitlementService(self.db)
        warnings = ent_service.get_company_warnings(company_id)

        return CurrentSubscriptionResponse(
            company_id=company.id,
            company_name=company.name,
            plan=plan_enum.value,
            plan_name=plan_defn["name"],
            status=subscription.status if subscription else "ACTIVE",
            price=plan_defn.get("price_inr"),
            price_display=plan_defn.get("price_display", plan_defn["price"]),
            currency=plan_defn.get("currency", "INR"),
            billing_period=plan_defn.get("billing_period", "month"),
            current_period_start=subscription.current_period_start if subscription else company.created_at,
            current_period_end=subscription.current_period_end if subscription else None,
            limits=plan_defn["limits"],
            included_features=plan_defn["included_features"],
            warnings=warnings,
            recent_payments=recent_payments,
        )

    def create_order(self, user: User, plan: SubscriptionPlan) -> CreateOrderResponse:
        """
        Creates an authoritative Razorpay order in INR (paise).
        The price is strictly resolved from backend PLAN_DEFINITIONS.
        """
        if not user.company_id:
            raise BaseBusinessException("User has no associated organization context.", status_code=400)

        if user.role != CompanyRole.OWNER:
            raise BaseBusinessException(
                "Permission Denied: Only the Organization CTO / Owner is authorized to change subscription.",
                status_code=403,
            )

        company = self.db.execute(
            select(Company).filter(Company.id == user.company_id)
        ).scalar_one_or_none()
        if not company:
            raise ResourceNotFound("Organization not found.")

        # FREE does not use Razorpay orders
        if plan == SubscriptionPlan.FREE:
            raise BaseBusinessException(
                "Free plan does not require payment. Use the free activation endpoint instead.",
                status_code=400,
            )

        ent_request = None
        if plan == SubscriptionPlan.ENTERPRISE:
            ent_request = self.db.execute(
                select(EnterpriseSubscriptionRequest)
                .filter(
                    EnterpriseSubscriptionRequest.company_id == company.id,
                    EnterpriseSubscriptionRequest.status == EnterpriseRequestStatus.PAYMENT_PENDING,
                )
                .order_by(desc(EnterpriseSubscriptionRequest.created_at))
            ).scalars().first()

            if not ent_request or not ent_request.calculated_price:
                raise BaseBusinessException(
                    "Enterprise plan requires an approved custom request before payment can be initiated.",
                    status_code=400,
                )
            amount_paise = ent_request.calculated_price * 100
        else:
            # Authoritative amount in paise
            try:
                amount_paise = get_authoritative_plan_price(plan)
            except ValueError as e:
                raise BaseBusinessException(str(e), status_code=400)

        # Call official Razorpay SDK
        client = self._get_razorpay_client()
        receipt = f"syn_{str(company.id)[:8]}_{uuid4().hex[:6]}"
        order_notes = {
            "company_id": str(company.id),
            "plan": plan.value,
            "user_id": str(user.id),
        }
        if ent_request:
            order_notes["enterprise_request_id"] = str(ent_request.id)

        order_payload = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": order_notes,
        }

        try:
            rzp_order = client.order.create(data=order_payload)
        except Exception as exc:
            logger.error(f"Razorpay order creation failed: {exc}")
            raise BaseBusinessException(
                f"Failed to initialize Razorpay payment order: {str(exc)}",
                status_code=502,
            )

        razorpay_order_id = rzp_order["id"]

        # Persist payment order attempt
        payment_order = PaymentOrder(
            id=uuid4(),
            company_id=company.id,
            user_id=user.id,
            plan=plan,
            razorpay_order_id=razorpay_order_id,
            amount=amount_paise,
            currency="INR",
            status="CREATED",
            receipt=receipt,
            notes=f"Initiated by {user.email} for {plan.value} plan",
        )
        self.db.add(payment_order)
        self.db.commit()

        user_name = f"{user.first_name} {user.last_name}".strip()
        return CreateOrderResponse(
            order_id=razorpay_order_id,
            key_id=settings.RAZORPAY_KEY_ID,
            amount=amount_paise,
            currency="INR",
            plan=plan.value,
            company_name=company.name,
            user_email=user.email,
            user_name=user_name or "Synapse CTO",
        )

    def verify_payment(self, user: User, payload: VerifyPaymentRequest) -> VerifyPaymentResponse:
        """
        Cryptographically verifies Razorpay signature via built-in HMAC-SHA256.
        Enforces idempotency, associates payment to organization, activates 30-day local entitlement,
        and updates Company.subscription_plan for immediate quota enforcement.
        """
        if not user.company_id:
            raise BaseBusinessException("User has no associated organization context.", status_code=400)

        if user.role != CompanyRole.OWNER:
            raise BaseBusinessException(
                "Permission Denied: Only the Organization CTO / Owner is authorized to verify subscription payments.",
                status_code=403,
            )

        company = self.db.execute(
            select(Company).filter(Company.id == user.company_id)
        ).scalar_one_or_none()
        if not company:
            raise ResourceNotFound("Organization not found.")

        # 1. Cryptographic HMAC-SHA256 signature verification
        key_secret = settings.RAZORPAY_KEY_SECRET
        if not key_secret:
            raise BaseBusinessException(
                "Razorpay secret key is not configured on the server.",
                status_code=500,
            )

        message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
        expected_signature = hmac.new(
            key_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
            logger.warning(
                f"Signature verification failed for order {payload.razorpay_order_id}, payment {payload.razorpay_payment_id}"
            )
            raise BaseBusinessException(
                "Payment verification failed: invalid cryptographic signature.",
                status_code=400,
            )

        # 2. Retrieve order and verify tenant ownership
        payment_order = self.db.execute(
            select(PaymentOrder).filter(
                PaymentOrder.razorpay_order_id == payload.razorpay_order_id
            )
        ).scalar_one_or_none()

        if not payment_order:
            raise BaseBusinessException(
                "Payment order record not found for the supplied order ID.",
                status_code=404,
            )

        if payment_order.company_id != company.id:
            logger.warning(
                f"Cross-tenant payment verification attempt: order {payment_order.id} belongs to {payment_order.company_id}, user belongs to {company.id}"
            )
            raise BaseBusinessException(
                "Permission Denied: This payment order does not belong to your organization.",
                status_code=403,
            )

        # 3. Idempotency Check: prevent duplicate activations or payments
        existing_payment = self.db.execute(
            select(Payment).filter(
                Payment.razorpay_payment_id == payload.razorpay_payment_id
            )
        ).scalar_one_or_none()

        subscription = self.db.execute(
            select(Subscription).filter(Subscription.company_id == company.id)
        ).scalar_one_or_none()

        if existing_payment and existing_payment.status == "SUCCESS":
            logger.info(
                f"Payment {payload.razorpay_payment_id} already processed. Returning existing subscription state (idempotent)."
            )
            return VerifyPaymentResponse(
                success=True,
                message="Payment was already processed successfully.",
                plan=company.subscription_plan.value,
                status="ACTIVE",
                current_period_end=subscription.current_period_end if subscription else None,
            )

        # 4. Activate local 30-day subscription entitlement
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        if not subscription:
            subscription = Subscription(
                id=uuid4(),
                company_id=company.id,
                plan=payment_order.plan,
                status="ACTIVE",
                current_period_start=now,
                current_period_end=period_end,
            )
            self.db.add(subscription)
            self.db.flush()
        else:
            subscription.plan = payment_order.plan
            subscription.status = "ACTIVE"
            subscription.current_period_start = now
            subscription.current_period_end = period_end

        # 5. Record verified payment
        payment = Payment(
            id=uuid4(),
            company_id=company.id,
            subscription_id=subscription.id,
            order_id=payment_order.id,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            amount=payment_order.amount,
            currency=payment_order.currency,
            status="SUCCESS",
            razorpay_signature=payload.razorpay_signature,
        )
        self.db.add(payment)

        # 6. Mark payment order PAID
        payment_order.status = "PAID"

        # 7. Update authoritative Company.subscription_plan for immediate backend quota updates
        company.subscription_plan = payment_order.plan

        # 8. If Enterprise plan, activate custom resources and update enterprise request
        if payment_order.plan == SubscriptionPlan.ENTERPRISE:
            ent_req = self.db.execute(
                select(EnterpriseSubscriptionRequest)
                .filter(
                    EnterpriseSubscriptionRequest.company_id == company.id,
                    EnterpriseSubscriptionRequest.status == EnterpriseRequestStatus.PAYMENT_PENDING,
                )
                .order_by(desc(EnterpriseSubscriptionRequest.created_at))
            ).scalars().first()

            if ent_req:
                ent_req.status = EnterpriseRequestStatus.ACTIVATED
                approved_lims = ent_req.approved_limits or {}
                approved_caps = ent_req.approved_capabilities or []

                storage_gb = approved_lims.get("max_storage_gb", -1)
                storage_bytes = (storage_gb * 1024 * 1024 * 1024) if storage_gb != -1 else -1

                alloc = self.db.execute(
                    select(CompanyResourceAllocation).filter(
                        CompanyResourceAllocation.company_id == company.id
                    )
                ).scalar_one_or_none()

                if not alloc:
                    alloc = CompanyResourceAllocation(
                        company_id=company.id,
                        custom_max_users=approved_lims.get("max_users", -1),
                        custom_max_projects=approved_lims.get("max_active_projects", -1),
                        custom_max_storage_bytes=storage_bytes,
                        custom_max_ai_executions=approved_lims.get("max_ai_executions", -1),
                        custom_max_automation_workflows=approved_lims.get("max_automation_workflows", -1),
                    )
                    alloc.custom_features = approved_caps
                    self.db.add(alloc)
                else:
                    alloc.custom_max_users = approved_lims.get("max_users", -1)
                    alloc.custom_max_projects = approved_lims.get("max_active_projects", -1)
                    alloc.custom_max_storage_bytes = storage_bytes
                    alloc.custom_max_ai_executions = approved_lims.get("max_ai_executions", -1)
                    alloc.custom_max_automation_workflows = approved_lims.get("max_automation_workflows", -1)
                    alloc.custom_features = approved_caps

                # Notify CTO of activation
                act_notif = Notification(
                    recipient_user_id=user.id,
                    company_id=company.id,
                    type=NotificationType.ENTERPRISE_ACTIVATED,
                    title="Enterprise Subscription Activated",
                    message="Your custom Enterprise subscription is now active with approved limits and capabilities.",
                    source_type="ENTERPRISE_REQUEST",
                    source_id=ent_req.id,
                    deep_link="/company/settings",
                    is_read=False,
                )
                self.db.add(act_notif)

        self.db.commit()
        self.db.refresh(company)

        logger.info(
            f"Successfully verified payment {payload.razorpay_payment_id} for company {company.id}. Upgraded to {payment_order.plan.value}."
        )

        return VerifyPaymentResponse(
            success=True,
            message=f"Payment verified successfully! Your organization subscription has been upgraded to {payment_order.plan.value}.",
            plan=payment_order.plan.value,
            status="ACTIVE",
            current_period_end=period_end,
        )

    def activate_free_plan(self, user: User) -> VerifyPaymentResponse:
        """
        Activates the FREE tier immediately without any Razorpay transaction.
        """
        if not user.company_id:
            raise BaseBusinessException("User has no associated organization context.", status_code=400)

        if user.role != CompanyRole.OWNER:
            raise BaseBusinessException(
                "Permission Denied: Only the Organization CTO / Owner is authorized to change subscription.",
                status_code=403,
            )

        company = self.db.execute(
            select(Company).filter(Company.id == user.company_id)
        ).scalar_one_or_none()
        if not company:
            raise ResourceNotFound("Organization not found.")

        subscription = self.db.execute(
            select(Subscription).filter(Subscription.company_id == company.id)
        ).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if not subscription:
            subscription = Subscription(
                id=uuid4(),
                company_id=company.id,
                plan=SubscriptionPlan.FREE,
                status="ACTIVE",
                current_period_start=now,
                current_period_end=None,
            )
            self.db.add(subscription)
        else:
            subscription.plan = SubscriptionPlan.FREE
            subscription.status = "ACTIVE"
            subscription.current_period_start = now
            subscription.current_period_end = None

        company.subscription_plan = SubscriptionPlan.FREE
        self.db.commit()

        return VerifyPaymentResponse(
            success=True,
            message="Free tier activated successfully. Your organization is ready to use Synapse.",
            plan=SubscriptionPlan.FREE.value,
            status="ACTIVE",
            current_period_end=None,
        )

    def create_enterprise_request(
        self,
        user: User,
        payload: CreateEnterpriseRequest,
        company: Company | None = None,
        commit: bool = True,
    ) -> EnterpriseRequestDetail:
        """
        Creates an Enterprise custom subscription request initiated by the CTO.
        Locks and checks DB to guarantee exactly one active request per company.
        Calculates initial estimated price breakdown and notifies platform Super Admins.
        """
        if not company:
            if not user.company_id:
                raise BaseBusinessException("User has no associated organization context.", status_code=400)

            company = self.db.execute(
                select(Company).filter(Company.id == user.company_id)
            ).scalar_one_or_none()
            if not company:
                raise ResourceNotFound("Organization not found.")

        if user.role != CompanyRole.OWNER:
            raise BaseBusinessException(
                "Permission Denied: Only the Organization CTO / Owner can request an Enterprise plan.",
                status_code=403,
            )

        # Concurrency safety: check for any active request
        existing_active = self.db.execute(
            select(EnterpriseSubscriptionRequest)
            .filter(
                EnterpriseSubscriptionRequest.company_id == company.id,
                EnterpriseSubscriptionRequest.status.in_([
                    EnterpriseRequestStatus.PENDING,
                    EnterpriseRequestStatus.UNDER_REVIEW,
                    EnterpriseRequestStatus.PAYMENT_PENDING,
                ]),
            )
            .with_for_update()
        ).scalars().first()

        if existing_active:
            raise BaseBusinessException(
                "An active Enterprise subscription request already exists for your organization.",
                status_code=400,
            )

        limits_dict = payload.limits.model_dump() if payload.limits else {}
        pricing_data = calculate_enterprise_pricing(
            limits_dict, payload.requested_capabilities
        )

        req_record = EnterpriseSubscriptionRequest(
            id=uuid4(),
            company_id=company.id,
            requested_by=user.id,
            status=EnterpriseRequestStatus.PENDING,
            requested_user_limit=limits_dict.get("max_users", -1),
            requested_project_limit=limits_dict.get("max_active_projects", -1),
            requested_storage_gb=limits_dict.get("max_storage_gb", -1),
            requested_ai_executions=limits_dict.get("max_ai_executions", -1),
            requested_automation_workflows=limits_dict.get("max_automation_workflows", -1),
            requested_capabilities=payload.requested_capabilities,
            requested_reason=payload.requested_reason,
            calculated_price=pricing_data["total_monthly_price"],
            price_breakdown=pricing_data,
            pricing_version=pricing_data["pricing_version"],
            currency="INR",
        )
        self.db.add(req_record)

        # Notify Platform Super Admins
        super_admins = self.db.execute(
            select(User).filter(User.is_super_admin == True)
        ).scalars().all()
        for sa in super_admins:
            admin_notif = Notification(
                recipient_user_id=sa.id,
                company_id=company.id,
                type=NotificationType.ENTERPRISE_REQUEST_SUBMITTED,
                title="New Enterprise Subscription Request",
                message=f"Organization '{company.name}' submitted a custom Enterprise plan request for review.",
                source_type="ENTERPRISE_REQUEST",
                source_id=req_record.id,
                deep_link=f"/admin/enterprise-requests?id={req_record.id}",
                is_read=False,
            )
            self.db.add(admin_notif)

        if commit:
            self.db.commit()
            self.db.refresh(req_record)
        else:
            self.db.flush()

        return self._to_enterprise_detail(req_record, company, user)

    def get_current_enterprise_request(self, company_id: UUID) -> EnterpriseRequestDetail | None:
        """Returns the most recent Enterprise request for the company."""
        req = self.db.execute(
            select(EnterpriseSubscriptionRequest)
            .filter(EnterpriseSubscriptionRequest.company_id == company_id)
            .order_by(desc(EnterpriseSubscriptionRequest.created_at))
        ).scalars().first()

        if not req:
            return None

        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        requester = self.db.execute(
            select(User).filter(User.id == req.requested_by)
        ).scalar_one_or_none() if req.requested_by else None

        return self._to_enterprise_detail(req, company, requester)

    def _to_enterprise_detail(
        self,
        req: EnterpriseSubscriptionRequest,
        company: Company | None = None,
        user: User | None = None,
    ) -> EnterpriseRequestDetail:
        comp_name = company.name if company else "Unknown Organization"
        user_name = f"{user.first_name} {user.last_name}".strip() if user else None
        user_email = user.email if user else None

        requested_res = {
            "max_users": req.requested_user_limit,
            "max_projects": req.requested_project_limit,
            "max_storage_bytes": -1 if req.requested_storage_gb < 0 else req.requested_storage_gb * 1024 * 1024 * 1024,
            "max_ai_executions": req.requested_ai_executions,
            "max_automation_workflows": req.requested_automation_workflows,
        }
        approved_res = None
        if req.approved_limits:
            st_gb = req.approved_limits.get("max_storage_gb", -1)
            approved_res = {
                "max_users": req.approved_limits.get("max_users", -1),
                "max_projects": req.approved_limits.get("max_active_projects", req.approved_limits.get("max_projects", -1)),
                "max_storage_bytes": -1 if st_gb < 0 else st_gb * 1024 * 1024 * 1024,
                "max_ai_executions": req.approved_limits.get("max_ai_executions", -1),
                "max_automation_workflows": req.approved_limits.get("max_automation_workflows", -1),
            }

        return EnterpriseRequestDetail(
            id=req.id,
            company_id=req.company_id,
            company_name=comp_name,
            requested_by=req.requested_by,
            requester_name=user_name,
            requester_email=user_email,
            status=req.status.value,
            requested_user_limit=req.requested_user_limit,
            requested_project_limit=req.requested_project_limit,
            requested_storage_gb=req.requested_storage_gb,
            requested_ai_executions=req.requested_ai_executions,
            requested_automation_workflows=req.requested_automation_workflows,
            requested_capabilities=req.requested_capabilities or [],
            requested_reason=req.requested_reason,
            approved_limits=req.approved_limits,
            approved_capabilities=req.approved_capabilities,
            calculated_price=req.calculated_price,
            price_breakdown=req.price_breakdown,
            pricing_version=req.pricing_version,
            currency=req.currency,
            admin_comment=req.admin_comment,
            approved_at=req.approved_at,
            rejected_at=req.rejected_at,
            created_at=req.created_at,
            updated_at=req.updated_at,
            requested_resources=requested_res,
            approved_resources=approved_res,
            business_justification=req.requested_reason,
            admin_notes=req.admin_comment,
            rejection_reason=req.admin_comment if req.status == EnterpriseRequestStatus.REJECTED else None,
        )

    def process_webhook(self, body_bytes: bytes, signature_header: str | None) -> dict:
        """
        Auxiliary webhook processing with HMAC signature verification.
        Synchronizes payment/order states if client-side verification was interrupted.
        """
        secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
        if not secret:
            logger.warning("Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured.")
            raise BaseBusinessException("Webhook secret not configured", status_code=500)

        if not signature_header:
            raise BaseBusinessException("Missing X-Razorpay-Signature header", status_code=400)

        expected_sig = hmac.new(
            secret.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, signature_header):
            logger.warning("Invalid webhook signature received.")
            raise BaseBusinessException("Invalid webhook signature", status_code=400)

        import json
        try:
            event_data = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            raise BaseBusinessException("Malformed webhook JSON", status_code=400)

        event_type = event_data.get("event")
        payload = event_data.get("payload", {})

        logger.info(f"Received Razorpay webhook event: {event_type}")

        if event_type == "payment.captured":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            if order_id and payment_id:
                order = self.db.execute(
                    select(PaymentOrder).filter(PaymentOrder.razorpay_order_id == order_id)
                ).scalar_one_or_none()
                if order and order.status != "PAID":
                    order.status = "PAID"
                    self.db.commit()

        return {"status": "processed", "event": event_type}
