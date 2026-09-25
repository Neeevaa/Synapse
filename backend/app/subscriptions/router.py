from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.orm import Session

from app.common.exceptions import Forbidden, ResourceNotFound
from app.common.responses import success_response
from app.db.session import get_db
from app.models.enums import CompanyRole
from app.models.user import User
from app.permissions.dependencies import get_current_user
from app.subscriptions.payment_service import SubscriptionPaymentService
from app.subscriptions.schemas import (
    CreateEnterpriseRequest,
    CreateOrderRequest,
    EnterpriseRequestDetail,
    SwitchFreePlanRequest,
    VerifyPaymentRequest,
)

router = APIRouter(tags=["Subscriptions & Billing"])


def require_cto_owner(current_user: User = Depends(get_current_user)) -> User:
    """Enforces strict RBAC: Only Organization CTO / Owner can view or manage billing."""
    if current_user.role != CompanyRole.OWNER:
        raise Forbidden("Permission Denied: Only the Organization CTO / Owner can manage subscriptions and billing.")
    if not current_user.company_id:
        raise ResourceNotFound("User is not associated with an active organization.")
    return current_user


@router.get("/subscriptions/current", status_code=status.HTTP_200_OK)
def get_current_subscription(
    current_user: User = Depends(require_cto_owner),
    db: Session = Depends(get_db),
):
    """
    Returns the organization's active subscription, 30-day period status, and recent payments.
    Protected strictly for CTO / Organization Owner.
    """
    service = SubscriptionPaymentService(db)
    sub_data = service.get_current_subscription(current_user.company_id)
    return success_response(
        data=sub_data,
        message="Current subscription details retrieved successfully.",
    )


@router.get("/subscriptions/plans", status_code=status.HTTP_200_OK)
def get_authoritative_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the official Synapse subscription plan catalog with authoritative INR prices,
    limits, and feature definitions.
    """
    service = SubscriptionPaymentService(db)
    plans_data = service.get_available_plans()
    return success_response(
        data=plans_data,
        message="Authoritative subscription plans retrieved successfully.",
    )


@router.post("/subscriptions/create-order", status_code=status.HTTP_200_OK)
def create_subscription_order(
    payload: CreateOrderRequest,
    current_user: User = Depends(require_cto_owner),
    db: Session = Depends(get_db),
):
    """
    Creates a Razorpay Order for the selected plan.
    Authoritative amount in paise is determined entirely by the backend plan configuration.
    """
    service = SubscriptionPaymentService(db)
    order_data = service.create_order(current_user, payload.plan)
    return success_response(
        data=order_data,
        message=f"Razorpay order for {payload.plan.value} plan initialized successfully.",
    )


@router.post("/subscriptions/verify-payment", status_code=status.HTTP_200_OK)
def verify_subscription_payment(
    payload: VerifyPaymentRequest,
    current_user: User = Depends(require_cto_owner),
    db: Session = Depends(get_db),
):
    """
    Cryptographically verifies the Razorpay payment signature.
    Activates the 30-day local subscription entitlement and updates company.subscription_plan upon success.
    """
    service = SubscriptionPaymentService(db)
    result = service.verify_payment(current_user, payload)
    return success_response(
        data=result,
        message=result.message,
    )


@router.post("/subscriptions/free", status_code=status.HTTP_200_OK)
def activate_free_plan(
    payload: SwitchFreePlanRequest,
    current_user: User = Depends(require_cto_owner),
    db: Session = Depends(get_db),
):
    """
    Directly activates the Free tier without initiating a Razorpay transaction.
    """
    service = SubscriptionPaymentService(db)
    result = service.activate_free_plan(current_user)
    return success_response(
        data=result,
        message=result.message,
    )


@router.post("/subscriptions/enterprise-request", status_code=status.HTTP_201_CREATED)
def create_enterprise_request(
    payload: CreateEnterpriseRequest,
    current_user: User = Depends(require_cto_owner),
    db: Session = Depends(get_db),
):
    """
    Submits a custom Enterprise subscription request specifying required limits and capabilities.
    Enforces that only one active request can exist per company.
    Notifies Super Admins for review and approval.
    """
    service = SubscriptionPaymentService(db)
    result = service.create_enterprise_request(current_user, payload)
    return success_response(
        data=result,
        message="Enterprise request submitted for review successfully.",
    )


@router.get("/subscriptions/enterprise-request/current", status_code=status.HTTP_200_OK)
def get_current_enterprise_request(
    current_user: User = Depends(require_cto_owner),
    db: Session = Depends(get_db),
):
    """
    Returns the organization's current Enterprise request status, approved limits/capabilities,
    and authoritative calculated price.
    """
    service = SubscriptionPaymentService(db)
    result = service.get_current_enterprise_request(current_user.company_id)
    return success_response(
        data=result,
        message="Current Enterprise request retrieved successfully.",
    )


@router.post("/payments/webhook/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None, alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db),
):
    """
    Auxiliary webhook endpoint for Razorpay payment notifications.
    Validates HMAC signature on the raw payload.
    """
    body_bytes = await request.body()
    service = SubscriptionPaymentService(db)
    result = service.process_webhook(body_bytes, x_razorpay_signature)
    return success_response(
        data=result,
        message="Webhook event processed successfully.",
    )
