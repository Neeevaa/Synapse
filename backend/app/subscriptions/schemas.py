from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, model_validator

from app.models.enums import SubscriptionPlan


class PlanLimitsSchema(BaseModel):
    max_team_members: int
    max_active_projects: int
    max_ai_executions_monthly: int
    max_storage_bytes: int
    max_storage_display: str
    max_automation_workflows: int


class AuthoritativePlanItem(BaseModel):
    code: str
    name: str
    price: int | None = None  # Price in INR rupees (e.g. 1999)
    price_display: str
    currency: str = "INR"
    billing_period: str = "month"
    description: str
    cta_text: str
    is_popular: bool
    limits: dict
    included_features: list[str]
    unavailable_features: list[str]


class PlansListResponse(BaseModel):
    plans: list[AuthoritativePlanItem]


class RecentPaymentItem(BaseModel):
    id: UUID
    razorpay_order_id: str
    razorpay_payment_id: str | None
    amount: int  # in paise
    amount_inr: float
    currency: str
    status: str
    created_at: datetime


class CurrentSubscriptionResponse(BaseModel):
    company_id: UUID
    company_name: str
    plan: str
    plan_name: str
    status: str
    price: int | None = None
    price_display: str
    currency: str = "INR"
    billing_period: str = "month"
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    limits: dict
    included_features: list[str]
    warnings: list[str] = Field(default_factory=list)
    recent_payments: list[RecentPaymentItem] = Field(default_factory=list)


class CreateOrderRequest(BaseModel):
    plan: SubscriptionPlan = Field(..., description="Target subscription tier identifier")
    # Note: Client is never allowed to supply amount. If extra fields are sent, they are ignored.

    model_config = {"extra": "ignore"}


class CreateOrderResponse(BaseModel):
    order_id: str
    key_id: str
    amount: int  # In paise (authoritative)
    currency: str = "INR"
    plan: str
    company_name: str
    user_email: str
    user_name: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    plan: str
    status: str
    current_period_end: datetime | None = None


class SwitchFreePlanRequest(BaseModel):
    plan: SubscriptionPlan = Field(default=SubscriptionPlan.FREE)


class EnterpriseResourceLimits(BaseModel):
    max_users: int = Field(default=-1, description="-1 = Unlimited")
    max_active_projects: int = Field(default=-1, description="-1 = Unlimited")
    max_projects: int | None = None
    max_storage_gb: int = Field(default=-1, description="-1 = Unlimited")
    max_storage_bytes: int | None = None
    max_ai_executions: int = Field(default=-1, description="-1 = Unlimited")
    max_automation_workflows: int = Field(default=-1, description="-1 = Unlimited")

    @model_validator(mode="after")
    def sync_aliases(self):
        if self.max_projects is not None and self.max_active_projects == -1:
            self.max_active_projects = self.max_projects
        elif self.max_active_projects != -1 and self.max_projects is None:
            self.max_projects = self.max_active_projects

        if self.max_storage_bytes is not None and self.max_storage_gb == -1:
            self.max_storage_gb = -1 if self.max_storage_bytes < 0 else max(1, self.max_storage_bytes // (1024 * 1024 * 1024))
        elif self.max_storage_gb != -1 and self.max_storage_bytes is None:
            self.max_storage_bytes = -1 if self.max_storage_gb < 0 else self.max_storage_gb * 1024 * 1024 * 1024
        return self


class CreateEnterpriseRequest(BaseModel):
    limits: EnterpriseResourceLimits | None = None
    requested_resources: EnterpriseResourceLimits | None = None
    requested_capabilities: list[str] = Field(default_factory=list)
    requested_reason: str | None = None
    business_justification: str | None = None

    @model_validator(mode="after")
    def sync_fields(self):
        if not self.limits and self.requested_resources:
            self.limits = self.requested_resources
        elif not self.limits:
            self.limits = EnterpriseResourceLimits()

        if not self.requested_reason and self.business_justification:
            self.requested_reason = self.business_justification
        return self


class CalculatePriceRequest(BaseModel):
    limits: EnterpriseResourceLimits | None = None
    resources: EnterpriseResourceLimits | None = None
    capabilities: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def sync_limits(self):
        if not self.limits and self.resources:
            self.limits = self.resources
        elif not self.limits:
            self.limits = EnterpriseResourceLimits()
        return self


class CalculatePriceResponse(BaseModel):
    base_fee: int
    capability_charges: dict[str, int]
    capability_total: int
    resource_charges: dict[str, int]
    resource_total: int
    total_monthly_price: int
    currency: str = "INR"
    pricing_version: str = "v1.0"
    capabilities_subtotal: int | None = None
    capabilities_items: list[dict] | None = None
    resources_subtotal: int | None = None
    resource_items: list[dict] | None = None

    @model_validator(mode="after")
    def sync_response_fields(self):
        if self.capabilities_subtotal is None:
            self.capabilities_subtotal = self.capability_total
        if self.resources_subtotal is None:
            self.resources_subtotal = self.resource_total
        return self


class EnterpriseRequestDetail(BaseModel):
    id: UUID
    company_id: UUID
    company_name: str
    requested_by: UUID | None = None
    requester_name: str | None = None
    requester_email: str | None = None
    status: str
    requested_user_limit: int
    requested_project_limit: int
    requested_storage_gb: int
    requested_ai_executions: int
    requested_automation_workflows: int
    requested_capabilities: list[str]
    requested_reason: str | None = None
    approved_limits: dict | None = None
    approved_capabilities: list[str] | None = None
    calculated_price: int | None = None
    price_breakdown: dict | None = None
    pricing_version: str | None = None
    currency: str = "INR"
    admin_comment: str | None = None
    approved_at: datetime | None = None
    rejected_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    # Frontend aliases
    requested_resources: dict | None = None
    approved_resources: dict | None = None
    business_justification: str | None = None
    admin_notes: str | None = None
    rejection_reason: str | None = None


class ApproveEnterpriseRequest(BaseModel):
    adjusted_limits: EnterpriseResourceLimits | None = None
    approved_resources: EnterpriseResourceLimits | None = None
    approved_capabilities: list[str] = Field(default_factory=list)
    admin_comment: str | None = None
    admin_notes: str | None = None

    @model_validator(mode="after")
    def sync_approval_fields(self):
        if not self.adjusted_limits and self.approved_resources:
            self.adjusted_limits = self.approved_resources
        elif not self.adjusted_limits:
            self.adjusted_limits = EnterpriseResourceLimits()

        if not self.admin_comment and self.admin_notes:
            self.admin_comment = self.admin_notes
        return self


class RejectEnterpriseRequest(BaseModel):
    admin_comment: str | None = None
    reason: str | None = None

    @model_validator(mode="after")
    def sync_rejection_reason(self):
        if not self.admin_comment and self.reason:
            self.admin_comment = self.reason
        if not self.admin_comment:
            raise ValueError("Rejection reason is required.")
        return self
