from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from app.models.enums import SubscriptionPlan, CompanyStatus


class ApprovalActionRequest(BaseModel):
    reason: str | None = Field(default=None, description="Optional reason for audit log")


class AdminCompanyItem(BaseModel):
    id: UUID
    name: str
    slug: str
    subscription_plan: SubscriptionPlan
    status: CompanyStatus
    is_active: bool
    user_count: int = 0
    project_count: int = 0
    task_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminCompanyListResponse(BaseModel):
    companies: list[AdminCompanyItem]
    total: int
    page: int
    limit: int


class AdminCompanyDetailResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    subscription_plan: SubscriptionPlan
    status: CompanyStatus
    is_active: bool
    user_count: int = 0
    active_user_count: int = 0
    project_count: int = 0
    task_count: int = 0
    storage_used: int = 0
    ai_execution_count: int = 0
    subscription_limits: dict[str, int] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyUserSummaryResponse(BaseModel):
    company_id: UUID
    total_users: int = 0
    active_users: int = 0
    suspended_users: int = 0
    pending_invitations: int = 0
    users_by_company_role: dict[str, int] = Field(default_factory=dict)


class CompanyResourceUsageResponse(BaseModel):
    company_id: UUID
    active_projects: int = 0
    total_projects: int = 0
    total_users: int = 0
    storage_used: int = 0
    storage_limit: int = 0
    ai_executions_used: int = 0
    ai_executions_limit: int = 0
    automation_workflows_used: int = 0
    automation_workflows_limit: int = 0
    api_requests_used: int = 0


class AdminAuditLogItem(BaseModel):
    id: UUID
    actor_super_admin_id: UUID
    company_id: UUID | None = None
    action: str
    previous_value: str | None = None
    new_value: str | None = None
    reason: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminAuditLogListResponse(BaseModel):
    logs: list[AdminAuditLogItem]
    total: int
    page: int
    limit: int


class UpdateAdminCompanyRequest(BaseModel):
    subscription_plan: SubscriptionPlan | None = None
    is_active: bool | None = None
    reason: str | None = None


class PlatformStatsResponse(BaseModel):
    total_companies: int
    total_users: int
    total_projects: int
    total_tasks: int


class CompanyResourceAllocationResponse(BaseModel):
    company_id: UUID
    subscription_plan: SubscriptionPlan
    custom_max_users: int | None = None
    custom_max_projects: int | None = None
    custom_max_storage_bytes: int | None = None
    custom_max_ai_executions: int | None = None
    custom_max_automation_workflows: int | None = None
    custom_features: list[str] | None = None
    effective_max_users: int
    effective_max_projects: int
    effective_max_storage_bytes: int
    effective_max_ai_executions: int
    effective_max_automation_workflows: int
    effective_enabled_features: list[str]
    warnings: list[str] = Field(default_factory=list)


class UpdateCompanyResourceAllocationRequest(BaseModel):
    custom_max_users: int | None = None
    custom_max_projects: int | None = None
    custom_max_storage_bytes: int | None = None
    custom_max_ai_executions: int | None = None
    custom_max_automation_workflows: int | None = None
    custom_features: list[str] | None = None
    reason: str | None = None


class AnalyticsOverviewResponse(BaseModel):
    total_companies: int
    active_companies: int
    pending_companies: int
    suspended_companies: int
    total_users: int
    active_users: int
    total_projects: int
    total_tasks: int
    ai_executions_this_month: int
    storage_used: int
    companies_by_subscription_plan: dict[str, int] = Field(default_factory=dict)


class TimeSeriesDataPoint(BaseModel):
    date: str
    count: int


class AnalyticsGrowthResponse(BaseModel):
    range: str
    company_registrations: list[TimeSeriesDataPoint]
    user_registrations: list[TimeSeriesDataPoint]
    ai_execution_volume: list[TimeSeriesDataPoint]
    active_companies: list[TimeSeriesDataPoint]


class AnalyticsSubscriptionsResponse(BaseModel):
    free_count: int
    starter_count: int
    pro_count: int
    enterprise_count: int
    total: int
    percentage_distribution: dict[str, float] = Field(default_factory=dict)


class AnalyticsAIUsageResponse(BaseModel):
    total_ai_executions: int
    queued_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    executions_by_type: dict[str, int] = Field(default_factory=dict)
    executions_this_month: int
