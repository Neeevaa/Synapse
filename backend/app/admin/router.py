from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.admin.schemas import (
    AdminCompanyListResponse,
    AdminCompanyDetailResponse,
    CompanyUserSummaryResponse,
    CompanyResourceUsageResponse,
    CompanyResourceAllocationResponse,
    UpdateCompanyResourceAllocationRequest,
    ApprovalActionRequest,
    UpdateAdminCompanyRequest,
    PlatformStatsResponse,
    AdminAuditLogListResponse,
    AnalyticsOverviewResponse,
    AnalyticsGrowthResponse,
    AnalyticsSubscriptionsResponse,
    AnalyticsAIUsageResponse,
)
from app.admin.service import AdminService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import require_super_admin
from app.models.user import User

router = APIRouter()


@router.get(
    "/stats",
    response_model=APIResponse[PlatformStatsResponse],
    status_code=status.HTTP_200_OK,
    summary="Get platform-wide statistics for Super Admin",
)
def get_platform_stats(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_platform_stats()
    return success_response(
        message="Platform statistics retrieved successfully.",
        data=result,
    )


@router.get(
    "/companies",
    response_model=APIResponse[AdminCompanyListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all companies with usage stats for Super Admin",
)
def list_companies(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.list_companies(page=page, limit=limit)
    return success_response(
        message="Companies retrieved successfully.",
        data=result,
    )


@router.get(
    "/companies/pending",
    response_model=APIResponse[AdminCompanyListResponse],
    status_code=status.HTTP_200_OK,
    summary="List companies pending Super Admin approval",
)
def get_pending_companies(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_pending_companies(page=page, limit=limit)
    return success_response(
        message="Pending companies retrieved successfully.",
        data=result,
    )


@router.get(
    "/companies/{id}",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Get safe platform metadata of a single company for Super Admin",
)
def get_company_detail(
    id: UUID,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_company_detail(id)
    return success_response(
        message="Company detail retrieved successfully.",
        data=result,
    )


@router.get(
    "/companies/{id}/users/summary",
    response_model=APIResponse[CompanyUserSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get aggregated user summary for a company",
)
def get_company_user_summary(
    id: UUID,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_company_user_summary(id)
    return success_response(
        message="Company user summary retrieved successfully.",
        data=result,
    )


@router.get(
    "/companies/{id}/usage",
    response_model=APIResponse[CompanyResourceUsageResponse],
    status_code=status.HTTP_200_OK,
    summary="Get platform resource usage metrics for a company",
)
def get_company_resource_usage(
    id: UUID,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_company_resource_usage(id)
    return success_response(
        message="Company resource usage retrieved successfully.",
        data=result,
    )


@router.get(
    "/companies/{id}/resources",
    response_model=APIResponse[CompanyResourceAllocationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get custom resource allocation & effective limits for a company",
)
def get_company_resources(
    id: UUID,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_company_resources(id)
    return success_response(
        message="Company resource allocation retrieved successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}/resources",
    response_model=APIResponse[CompanyResourceAllocationResponse],
    status_code=status.HTTP_200_OK,
    summary="Update custom resource allocations and feature overrides for a company",
)
def update_company_resources(
    id: UUID,
    req: Request,
    data: UpdateCompanyResourceAllocationRequest,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.update_company_resources(
        company_id=id,
        data=data,
        super_admin_id=current_user.id,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company resource allocation updated successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}/approve",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Approve a company organization",
)
def approve_company(
    id: UUID,
    req: Request,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.approve_company(
        company_id=id,
        super_admin_id=current_user.id,
        reason=data.reason,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company approved successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}/reject",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Reject a pending company organization",
)
def reject_company(
    id: UUID,
    req: Request,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.reject_company(
        company_id=id,
        super_admin_id=current_user.id,
        reason=data.reason,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company rejected successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}/suspend",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Suspend an active company organization",
)
def suspend_company(
    id: UUID,
    req: Request,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.suspend_company(
        company_id=id,
        super_admin_id=current_user.id,
        reason=data.reason,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company suspended successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}/reactivate",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Reactivate a suspended or deactivated company organization",
)
def reactivate_company(
    id: UUID,
    req: Request,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.reactivate_company(
        company_id=id,
        super_admin_id=current_user.id,
        reason=data.reason,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company reactivated successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}/deactivate",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Deactivate a company organization",
)
def deactivate_company(
    id: UUID,
    req: Request,
    data: ApprovalActionRequest = ApprovalActionRequest(),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.deactivate_company(
        company_id=id,
        super_admin_id=current_user.id,
        reason=data.reason,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company deactivated successfully.",
        data=result,
    )


@router.patch(
    "/companies/{id}",
    response_model=APIResponse[AdminCompanyDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Update plan or active status of a company for Super Admin",
)
def update_company(
    id: UUID,
    req: Request,
    data: UpdateAdminCompanyRequest,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.update_company(
        company_id=id,
        data=data,
        super_admin_id=current_user.id,
        ip_address=req.client.host if req.client else None,
        user_agent=req.headers.get("user-agent"),
    )
    return success_response(
        message="Company updated successfully.",
        data=result,
    )


@router.get(
    "/audit-logs",
    response_model=APIResponse[AdminAuditLogListResponse],
    status_code=status.HTTP_200_OK,
    summary="List platform Super Admin audit logs",
)
def list_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    company_id: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_audit_logs(
        page=page,
        limit=limit,
        company_id=company_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
    )
    return success_response(
        message="Audit logs retrieved successfully.",
        data=result,
    )


@router.get(
    "/analytics/overview",
    response_model=APIResponse[AnalyticsOverviewResponse],
    status_code=status.HTTP_200_OK,
    summary="Get aggregated platform overview metrics for Super Admin",
)
def get_analytics_overview(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_analytics_overview()
    return success_response(
        message="Analytics overview retrieved successfully.",
        data=result,
    )


@router.get(
    "/analytics/growth",
    response_model=APIResponse[AnalyticsGrowthResponse],
    status_code=status.HTTP_200_OK,
    summary="Get time-series growth aggregates for Super Admin",
)
def get_analytics_growth(
    range: str = Query(default="30d", description="Time range: 7d, 30d, 90d, 1y"),
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_analytics_growth(range_key=range)
    return success_response(
        message="Analytics growth retrieved successfully.",
        data=result,
    )


@router.get(
    "/analytics/subscriptions",
    response_model=APIResponse[AnalyticsSubscriptionsResponse],
    status_code=status.HTTP_200_OK,
    summary="Get subscription tier distribution metrics for Super Admin",
)
def get_analytics_subscriptions(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_analytics_subscriptions()
    return success_response(
        message="Subscription analytics retrieved successfully.",
        data=result,
    )


@router.get(
    "/analytics/ai-usage",
    response_model=APIResponse[AnalyticsAIUsageResponse],
    status_code=status.HTTP_200_OK,
    summary="Get aggregated AI execution metrics for Super Admin",
)
def get_analytics_ai_usage(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    result = service.get_analytics_ai_usage()
    return success_response(
        message="AI usage analytics retrieved successfully.",
        data=result,
    )
