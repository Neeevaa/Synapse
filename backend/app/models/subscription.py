from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import SubscriptionPlan, EnterpriseRequestStatus


class Subscription(BaseModel):
    """
    Organization-level local subscription record representing active entitlement period.
    In the 30-day prototype model, successful verification sets current_period_end = now + 30 days.
    """
    __tablename__ = "subscriptions"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan),
        default=SubscriptionPlan.FREE,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
    )

    razorpay_subscription_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    company = relationship("Company", backref="subscription")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")


class PaymentOrder(BaseModel):
    """
    Authoritative record of a Razorpay Order attempt initiated by an authorized CTO/owner.
    Ensures order parameters (amount in paise, plan, company) are strictly bounded server-side.
    """
    __tablename__ = "payment_orders"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan),
        nullable=False,
    )

    razorpay_order_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )  # Amount in paise (e.g. 199900)

    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="CREATED",
        nullable=False,
    )  # CREATED, PAID, FAILED, EXPIRED

    receipt: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    company = relationship("Company")
    user = relationship("User")


class Payment(BaseModel):
    """
    Verified payment transaction associated with an order, company, and subscription.
    Enforces idempotency and stores cryptographic signature for non-repudiation.
    """
    __tablename__ = "payments"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    subscription_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
    )

    order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("payment_orders.id", ondelete="SET NULL"),
        nullable=True,
    )

    razorpay_order_id: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )

    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=True,
    )

    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )  # In paise

    currency: Mapped[str] = mapped_column(
        String(10),
        default="INR",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="SUCCESS",
        nullable=False,
    )  # SUCCESS, FAILED, REFUNDED

    razorpay_signature: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    method: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    error_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    error_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
    company = relationship("Company")
    order = relationship("PaymentOrder")


class EnterpriseSubscriptionRequest(BaseModel):
    """
    Tracks custom Enterprise plan requests through review, super admin approval,
    authoritative dynamic pricing, CTO review, and payment activation.
    """
    __tablename__ = "enterprise_subscription_requests"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    requested_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    status: Mapped[EnterpriseRequestStatus] = mapped_column(
        Enum(EnterpriseRequestStatus, name="enterpriserequeststatus", create_type=False),
        default=EnterpriseRequestStatus.PENDING,
        index=True,
        nullable=False,
    )

    requested_user_limit: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)
    requested_project_limit: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)
    requested_storage_gb: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)
    requested_ai_executions: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)
    requested_automation_workflows: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)
    requested_capabilities: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    requested_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Immutable Approved Snapshot
    approved_limits: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    approved_capabilities: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    calculated_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # in INR
    price_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pricing_version: Mapped[str | None] = mapped_column(String(20), nullable=True)

    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    company = relationship("Company", backref="enterprise_requests")
    requester = relationship("User", foreign_keys=[requested_by])
