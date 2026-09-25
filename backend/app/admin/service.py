from typing import Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.ai_job import AIJob
from app.models.invitation import Invitation
from app.models.admin_audit_log import AdminAuditLog
from app.models.company_resource import CompanyResourceAllocation
from app.models.enums import SubscriptionPlan, CompanyStatus, ProjectStatus, AIJobStatus, EnterpriseRequestStatus, NotificationType
from app.models.subscription import EnterpriseSubscriptionRequest
from app.models.notification import Notification
from app.subscriptions.enterprise_pricing import calculate_enterprise_pricing, ENTERPRISE_CAPABILITIES_CATALOG
from app.subscriptions.schemas import (
    EnterpriseRequestDetail,
    ApproveEnterpriseRequest,
    RejectEnterpriseRequest,
    CalculatePriceRequest,
    CalculatePriceResponse,
    EnterpriseResourceLimits,
)
from app.subscriptions.service import EntitlementService
from app.admin.schemas import (
    AdminCompanyItem,
    AdminCompanyListResponse,
    AdminCompanyDetailResponse,
    CompanyUserSummaryResponse,
    CompanyResourceUsageResponse,
    CompanyResourceAllocationResponse,
    UpdateCompanyResourceAllocationRequest,
    AdminAuditLogItem,
    AdminAuditLogListResponse,
    UpdateAdminCompanyRequest,
    PlatformStatsResponse,
    AnalyticsOverviewResponse,
    AnalyticsGrowthResponse,
    AnalyticsSubscriptionsResponse,
    AnalyticsAIUsageResponse,
    TimeSeriesDataPoint,
)
from app.common.exceptions import ResourceNotFound, BaseBusinessException


def get_subscription_limits(plan: SubscriptionPlan) -> dict[str, int]:
    if plan == SubscriptionPlan.ENTERPRISE:
        return {
            "max_users": 1000,
            "max_projects": 500,
            "storage_limit_mb": 102400,
            "ai_executions_limit": 50000,
            "automation_workflows_limit": 10000,
        }
    elif plan == SubscriptionPlan.PRO or plan == SubscriptionPlan.STARTER:
        return {
            "max_users": 100,
            "max_projects": 50,
            "storage_limit_mb": 10240,
            "ai_executions_limit": 5000,
            "automation_workflows_limit": 1000,
        }
    else:
        return {
            "max_users": 10,
            "max_projects": 5,
            "storage_limit_mb": 1024,
            "ai_executions_limit": 500,
            "automation_workflows_limit": 100,
        }


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    def create_audit_log(
        self,
        actor_id: UUID,
        company_id: UUID | None,
        action: str,
        previous_value: str | None = None,
        new_value: str | None = None,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminAuditLog:
        log = AdminAuditLog(
            actor_super_admin_id=actor_id,
            company_id=company_id,
            action=action,
            previous_value=previous_value,
            new_value=new_value,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        return log

    def get_platform_stats(self) -> PlatformStatsResponse:
        total_companies = self.db.scalar(select(func.count(Company.id))) or 0
        total_users = self.db.scalar(select(func.count(User.id))) or 0
        total_projects = self.db.scalar(select(func.count(Project.id))) or 0
        total_tasks = self.db.scalar(select(func.count(Task.id))) or 0

        return PlatformStatsResponse(
            total_companies=total_companies,
            total_users=total_users,
            total_projects=total_projects,
            total_tasks=total_tasks,
        )

    def list_companies(self, page: int = 1, limit: int = 10) -> AdminCompanyListResponse:
        offset = (page - 1) * limit
        total = self.db.scalar(select(func.count(Company.id))) or 0

        companies = self.db.scalars(
            select(Company)
            .order_by(Company.created_at.desc())
            .offset(offset)
            .limit(limit)
        ).all()

        company_items = []
        for c in companies:
            user_count = self.db.scalar(
                select(func.count(User.id)).filter(User.company_id == c.id)
            ) or 0

            project_count = self.db.scalar(
                select(func.count(Project.id)).filter(Project.company_id == c.id)
            ) or 0

            task_count = self.db.scalar(
                select(func.count(Task.id)).filter(
                    Task.project_id.in_(
                        select(Project.id).filter(Project.company_id == c.id)
                    )
                )
            ) or 0

            company_items.append(
                AdminCompanyItem(
                    id=c.id,
                    name=c.name,
                    slug=c.slug,
                    subscription_plan=c.subscription_plan,
                    status=c.status,
                    is_active=c.is_active,
                    user_count=user_count,
                    project_count=project_count,
                    task_count=task_count,
                    created_at=c.created_at,
                )
            )

        return AdminCompanyListResponse(
            companies=company_items,
            total=total,
            page=page,
            limit=limit,
        )

    def get_pending_companies(self, page: int = 1, limit: int = 10) -> AdminCompanyListResponse:
        offset = (page - 1) * limit
        query = select(Company).filter(Company.status == CompanyStatus.PENDING_APPROVAL)
        total = self.db.scalar(select(func.count(Company.id)).filter(Company.status == CompanyStatus.PENDING_APPROVAL)) or 0

        companies = self.db.scalars(
            query.order_by(Company.created_at.desc()).offset(offset).limit(limit)
        ).all()

        company_items = []
        for c in companies:
            user_count = self.db.scalar(
                select(func.count(User.id)).filter(User.company_id == c.id)
            ) or 0
            project_count = self.db.scalar(
                select(func.count(Project.id)).filter(Project.company_id == c.id)
            ) or 0
            task_count = self.db.scalar(
                select(func.count(Task.id)).filter(
                    Task.project_id.in_(
                        select(Project.id).filter(Project.company_id == c.id)
                    )
                )
            ) or 0

            company_items.append(
                AdminCompanyItem(
                    id=c.id,
                    name=c.name,
                    slug=c.slug,
                    subscription_plan=c.subscription_plan,
                    status=c.status,
                    is_active=c.is_active,
                    user_count=user_count,
                    project_count=project_count,
                    task_count=task_count,
                    created_at=c.created_at,
                )
            )

        return AdminCompanyListResponse(
            companies=company_items,
            total=total,
            page=page,
            limit=limit,
        )

    def get_company_detail(self, company_id: UUID) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        user_count = self.db.scalar(
            select(func.count(User.id)).filter(User.company_id == company.id)
        ) or 0

        active_user_count = self.db.scalar(
            select(func.count(User.id)).filter(
                User.company_id == company.id, User.is_active == True
            )
        ) or 0

        project_count = self.db.scalar(
            select(func.count(Project.id)).filter(Project.company_id == company.id)
        ) or 0

        task_count = self.db.scalar(
            select(func.count(Task.id)).filter(
                Task.project_id.in_(
                    select(Project.id).filter(Project.company_id == company.id)
                )
            )
        ) or 0

        ai_execution_count = self.db.scalar(
            select(func.count(AIJob.id)).filter(
                AIJob.project_id.in_(
                    select(Project.id).filter(Project.company_id == company.id)
                )
            )
        ) or 0

        limits = get_subscription_limits(company.subscription_plan)

        return AdminCompanyDetailResponse(
            id=company.id,
            name=company.name,
            slug=company.slug,
            description=company.description,
            logo_url=company.logo_url,
            subscription_plan=company.subscription_plan,
            status=company.status,
            is_active=company.is_active,
            user_count=user_count,
            active_user_count=active_user_count,
            project_count=project_count,
            task_count=task_count,
            storage_used=0,
            ai_execution_count=ai_execution_count,
            subscription_limits=limits,
            created_at=company.created_at,
            updated_at=company.updated_at,
        )

    def get_company_user_summary(self, company_id: UUID) -> CompanyUserSummaryResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        total_users = self.db.scalar(
            select(func.count(User.id)).filter(User.company_id == company.id)
        ) or 0

        active_users = self.db.scalar(
            select(func.count(User.id)).filter(
                User.company_id == company.id, User.is_active == True
            )
        ) or 0

        suspended_users = self.db.scalar(
            select(func.count(User.id)).filter(
                User.company_id == company.id, User.is_active == False
            )
        ) or 0

        pending_invitations = self.db.scalar(
            select(func.count(Invitation.id)).filter(
                Invitation.company_id == company.id
            )
        ) or 0

        roles_query = self.db.execute(
            select(User.role, func.count(User.id))
            .filter(User.company_id == company.id)
            .group_by(User.role)
        ).all()

        users_by_role = {}
        for role, count in roles_query:
            role_key = role.value if hasattr(role, "value") else (str(role) if role else "MEMBER")
            users_by_role[role_key] = count

        return CompanyUserSummaryResponse(
            company_id=company.id,
            total_users=total_users,
            active_users=active_users,
            suspended_users=suspended_users,
            pending_invitations=pending_invitations,
            users_by_company_role=users_by_role,
        )

    def get_company_resource_usage(self, company_id: UUID) -> CompanyResourceUsageResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        active_projects = self.db.scalar(
            select(func.count(Project.id)).filter(
                Project.company_id == company.id, Project.status == ProjectStatus.ACTIVE
            )
        ) or 0

        total_projects = self.db.scalar(
            select(func.count(Project.id)).filter(Project.company_id == company.id)
        ) or 0

        total_users = self.db.scalar(
            select(func.count(User.id)).filter(User.company_id == company.id)
        ) or 0

        ai_executions_used = self.db.scalar(
            select(func.count(AIJob.id)).filter(
                AIJob.project_id.in_(
                    select(Project.id).filter(Project.company_id == company.id)
                )
            )
        ) or 0

        limits = get_subscription_limits(company.subscription_plan)

        return CompanyResourceUsageResponse(
            company_id=company.id,
            active_projects=active_projects,
            total_projects=total_projects,
            total_users=total_users,
            storage_used=0,
            storage_limit=limits["storage_limit_mb"],
            ai_executions_used=ai_executions_used,
            ai_executions_limit=limits["ai_executions_limit"],
            automation_workflows_used=0,
            automation_workflows_limit=limits["automation_workflows_limit"],
            api_requests_used=0,
        )

    def approve_company(
        self,
        company_id: UUID,
        super_admin_id: UUID,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        if company.status == CompanyStatus.ACTIVE:
            raise BaseBusinessException(
                status_code=400, message=f"Company is already in '{company.status.value}' state."
            )

        prev_status = company.status.value
        company.status = CompanyStatus.ACTIVE
        company.is_active = True

        self.create_audit_log(
            actor_id=super_admin_id,
            company_id=company.id,
            action="COMPANY_APPROVED",
            previous_value=prev_status,
            new_value=CompanyStatus.ACTIVE.value,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()
        return self.get_company_detail(company.id)

    def reject_company(
        self,
        company_id: UUID,
        super_admin_id: UUID,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        if company.status != CompanyStatus.PENDING_APPROVAL:
            raise BaseBusinessException(
                status_code=400, message=f"Cannot reject company in state '{company.status.value}'."
            )

        prev_status = company.status.value
        company.status = CompanyStatus.REJECTED
        company.is_active = False

        self.create_audit_log(
            actor_id=super_admin_id,
            company_id=company.id,
            action="COMPANY_REJECTED",
            previous_value=prev_status,
            new_value=CompanyStatus.REJECTED.value,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()
        return self.get_company_detail(company.id)

    def suspend_company(
        self,
        company_id: UUID,
        super_admin_id: UUID,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        if company.status in (CompanyStatus.SUSPENDED, CompanyStatus.REJECTED):
            raise BaseBusinessException(
                status_code=400, message=f"Cannot suspend company in state '{company.status.value}'."
            )

        prev_status = company.status.value
        company.status = CompanyStatus.SUSPENDED
        company.is_active = False

        self.create_audit_log(
            actor_id=super_admin_id,
            company_id=company.id,
            action="COMPANY_SUSPENDED",
            previous_value=prev_status,
            new_value=CompanyStatus.SUSPENDED.value,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()
        return self.get_company_detail(company.id)

    def reactivate_company(
        self,
        company_id: UUID,
        super_admin_id: UUID,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        if company.status in (CompanyStatus.ACTIVE, CompanyStatus.PENDING_APPROVAL):
            raise BaseBusinessException(
                status_code=400, message=f"Cannot reactivate company in state '{company.status.value}'."
            )

        prev_status = company.status.value
        company.status = CompanyStatus.ACTIVE
        company.is_active = True

        self.create_audit_log(
            actor_id=super_admin_id,
            company_id=company.id,
            action="COMPANY_REACTIVATED",
            previous_value=prev_status,
            new_value=CompanyStatus.ACTIVE.value,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()
        return self.get_company_detail(company.id)

    def deactivate_company(
        self,
        company_id: UUID,
        super_admin_id: UUID,
        reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        if company.status in (CompanyStatus.DEACTIVATED, CompanyStatus.REJECTED):
            raise BaseBusinessException(
                status_code=400, message=f"Cannot deactivate company in state '{company.status.value}'."
            )

        prev_status = company.status.value
        company.status = CompanyStatus.DEACTIVATED
        company.is_active = False

        self.create_audit_log(
            actor_id=super_admin_id,
            company_id=company.id,
            action="COMPANY_DEACTIVATED",
            previous_value=prev_status,
            new_value=CompanyStatus.DEACTIVATED.value,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()
        return self.get_company_detail(company.id)

    def update_company(
        self,
        company_id: UUID,
        data: UpdateAdminCompanyRequest,
        super_admin_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AdminCompanyDetailResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        try:
            if data.subscription_plan is not None and data.subscription_plan != company.subscription_plan:
                prev_plan = company.subscription_plan.value
                company.subscription_plan = data.subscription_plan
                self.create_audit_log(
                    actor_id=super_admin_id,
                    company_id=company.id,
                    action="SUBSCRIPTION_CHANGED",
                    previous_value=prev_plan,
                    new_value=data.subscription_plan.value,
                    reason=data.reason,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

            if data.is_active is not None and data.is_active != company.is_active:
                prev_active = str(company.is_active)
                company.is_active = data.is_active
                if not data.is_active and company.status == CompanyStatus.ACTIVE:
                    company.status = CompanyStatus.SUSPENDED
                elif data.is_active and company.status == CompanyStatus.SUSPENDED:
                    company.status = CompanyStatus.ACTIVE

                self.create_audit_log(
                    actor_id=super_admin_id,
                    company_id=company.id,
                    action="COMPANY_STATUS_CHANGED",
                    previous_value=prev_active,
                    new_value=str(data.is_active),
                    reason=data.reason,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

            self.db.commit()
            return self.get_company_detail(company_id)
        except Exception as e:
            self.db.rollback()
            raise e

    def get_audit_logs(
        self,
        page: int = 1,
        limit: int = 10,
        company_id: UUID | None = None,
        action: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> AdminAuditLogListResponse:
        offset = (page - 1) * limit
        query = select(AdminAuditLog)

        if company_id:
            query = query.filter(AdminAuditLog.company_id == company_id)
        if action:
            query = query.filter(AdminAuditLog.action == action)
        if start_date:
            query = query.filter(AdminAuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AdminAuditLog.created_at <= end_date)

        total_query = select(func.count(AdminAuditLog.id))
        if company_id:
            total_query = total_query.filter(AdminAuditLog.company_id == company_id)
        if action:
            total_query = total_query.filter(AdminAuditLog.action == action)
        if start_date:
            total_query = total_query.filter(AdminAuditLog.created_at >= start_date)
        if end_date:
            total_query = total_query.filter(AdminAuditLog.created_at <= end_date)

        total = self.db.scalar(total_query) or 0
        logs = self.db.scalars(
            query.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit)
        ).all()

        log_items = [
            AdminAuditLogItem(
                id=log.id,
                actor_super_admin_id=log.actor_super_admin_id,
                company_id=log.company_id,
                action=log.action,
                previous_value=log.previous_value,
                new_value=log.new_value,
                reason=log.reason,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at,
            )
            for log in logs
        ]

        return AdminAuditLogListResponse(
            logs=log_items,
            total=total,
            page=page,
            limit=limit,
        )

    def get_company_resources(self, company_id: UUID) -> CompanyResourceAllocationResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        alloc = self.db.execute(
            select(CompanyResourceAllocation).filter(
                CompanyResourceAllocation.company_id == company.id
            )
        ).scalar_one_or_none()

        ent_service = EntitlementService(self.db)
        effective = ent_service.get_effective_entitlements(company_id)
        warnings = ent_service.get_company_warnings(company_id)

        return CompanyResourceAllocationResponse(
            company_id=company.id,
            subscription_plan=company.subscription_plan,
            custom_max_users=alloc.custom_max_users if alloc else None,
            custom_max_projects=alloc.custom_max_projects if alloc else None,
            custom_max_storage_bytes=alloc.custom_max_storage_bytes if alloc else None,
            custom_max_ai_executions=alloc.custom_max_ai_executions if alloc else None,
            custom_max_automation_workflows=alloc.custom_max_automation_workflows if alloc else None,
            custom_features=alloc.custom_features if alloc else None,
            effective_max_users=effective.max_users,
            effective_max_projects=effective.max_active_projects,
            effective_max_storage_bytes=effective.max_storage_bytes,
            effective_max_ai_executions=effective.max_ai_executions,
            effective_max_automation_workflows=effective.max_automation_workflows,
            effective_enabled_features=sorted(list(effective.enabled_features)),
            warnings=warnings,
        )

    def update_company_resources(
        self,
        company_id: UUID,
        data: UpdateCompanyResourceAllocationRequest,
        super_admin_id: UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> CompanyResourceAllocationResponse:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        alloc = self.db.execute(
            select(CompanyResourceAllocation).filter(
                CompanyResourceAllocation.company_id == company.id
            )
        ).scalar_one_or_none()

        if not alloc:
            alloc = CompanyResourceAllocation(company_id=company.id)
            self.db.add(alloc)

        prev_val = f"users:{alloc.custom_max_users}, projects:{alloc.custom_max_projects}, features:{alloc.custom_features}"

        if data.custom_max_users is not None:
            alloc.custom_max_users = data.custom_max_users
        if data.custom_max_projects is not None:
            alloc.custom_max_projects = data.custom_max_projects
        if data.custom_max_storage_bytes is not None:
            alloc.custom_max_storage_bytes = data.custom_max_storage_bytes
        if data.custom_max_ai_executions is not None:
            alloc.custom_max_ai_executions = data.custom_max_ai_executions
        if data.custom_max_automation_workflows is not None:
            alloc.custom_max_automation_workflows = data.custom_max_automation_workflows
        if data.custom_features is not None:
            alloc.custom_features = data.custom_features

        new_val = f"users:{alloc.custom_max_users}, projects:{alloc.custom_max_projects}, features:{alloc.custom_features}"

        self.create_audit_log(
            actor_id=super_admin_id,
            company_id=company.id,
            action="RESOURCE_LIMIT_CHANGED",
            previous_value=prev_val,
            new_value=new_val,
            reason=data.reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.commit()
        return self.get_company_resources(company_id)

    def get_analytics_overview(self) -> AnalyticsOverviewResponse:
        total_companies = self.db.scalar(select(func.count(Company.id))) or 0
        active_companies = self.db.scalar(
            select(func.count(Company.id)).filter(Company.status == CompanyStatus.ACTIVE)
        ) or 0
        pending_companies = self.db.scalar(
            select(func.count(Company.id)).filter(Company.status == CompanyStatus.PENDING_APPROVAL)
        ) or 0
        suspended_companies = self.db.scalar(
            select(func.count(Company.id)).filter(Company.status == CompanyStatus.SUSPENDED)
        ) or 0

        total_users = self.db.scalar(select(func.count(User.id))) or 0
        active_users = self.db.scalar(
            select(func.count(User.id)).filter(User.is_active.is_(True))
        ) or 0

        total_projects = self.db.scalar(select(func.count(Project.id))) or 0
        total_tasks = self.db.scalar(select(func.count(Task.id))) or 0

        # AI Executions this month
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        ai_executions_this_month = self.db.scalar(
            select(func.count(AIJob.id)).filter(AIJob.created_at >= month_start)
        ) or 0

        storage_used = 0

        # Companies by subscription plan
        plan_counts_rows = self.db.execute(
            select(Company.subscription_plan, func.count(Company.id)).group_by(Company.subscription_plan)
        ).all()

        companies_by_plan = {
            "FREE": 0,
            "STARTER": 0,
            "PRO": 0,
            "ENTERPRISE": 0,
        }
        for plan_val, count in plan_counts_rows:
            key = plan_val.value if isinstance(plan_val, SubscriptionPlan) else str(plan_val)
            companies_by_plan[key] = count

        return AnalyticsOverviewResponse(
            total_companies=total_companies,
            active_companies=active_companies,
            pending_companies=pending_companies,
            suspended_companies=suspended_companies,
            total_users=total_users,
            active_users=active_users,
            total_projects=total_projects,
            total_tasks=total_tasks,
            ai_executions_this_month=ai_executions_this_month,
            storage_used=storage_used,
            companies_by_subscription_plan=companies_by_plan,
        )

    def get_analytics_growth(self, range_key: str = "30d") -> AnalyticsGrowthResponse:
        valid_ranges = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = valid_ranges.get(range_key, 30)

        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        # 1. Company registrations
        co_rows = self.db.execute(
            select(func.date(Company.created_at), func.count(Company.id))
            .filter(Company.created_at >= start_date)
            .group_by(func.date(Company.created_at))
            .order_by(func.date(Company.created_at))
        ).all()
        company_regs = [
            TimeSeriesDataPoint(date=str(d), count=c) for d, c in co_rows
        ]

        # 2. User registrations
        user_rows = self.db.execute(
            select(func.date(User.created_at), func.count(User.id))
            .filter(User.created_at >= start_date)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        ).all()
        user_regs = [
            TimeSeriesDataPoint(date=str(d), count=c) for d, c in user_rows
        ]

        # 3. AI execution volume
        ai_rows = self.db.execute(
            select(func.date(AIJob.created_at), func.count(AIJob.id))
            .filter(AIJob.created_at >= start_date)
            .group_by(func.date(AIJob.created_at))
            .order_by(func.date(AIJob.created_at))
        ).all()
        ai_volume = [
            TimeSeriesDataPoint(date=str(d), count=c) for d, c in ai_rows
        ]

        # 4. Active companies over time
        active_co_rows = self.db.execute(
            select(func.date(Company.created_at), func.count(Company.id))
            .filter(Company.created_at >= start_date, Company.status == CompanyStatus.ACTIVE)
            .group_by(func.date(Company.created_at))
            .order_by(func.date(Company.created_at))
        ).all()
        active_cos = [
            TimeSeriesDataPoint(date=str(d), count=c) for d, c in active_co_rows
        ]

        return AnalyticsGrowthResponse(
            range=range_key,
            company_registrations=company_regs,
            user_registrations=user_regs,
            ai_execution_volume=ai_volume,
            active_companies=active_cos,
        )

    def get_analytics_subscriptions(self) -> AnalyticsSubscriptionsResponse:
        plan_counts_rows = self.db.execute(
            select(Company.subscription_plan, func.count(Company.id)).group_by(Company.subscription_plan)
        ).all()

        counts = {
            SubscriptionPlan.FREE: 0,
            SubscriptionPlan.STARTER: 0,
            SubscriptionPlan.PRO: 0,
            SubscriptionPlan.ENTERPRISE: 0,
        }

        for plan_val, count in plan_counts_rows:
            enum_key = plan_val if isinstance(plan_val, SubscriptionPlan) else SubscriptionPlan(plan_val)
            counts[enum_key] = count

        free_cnt = counts[SubscriptionPlan.FREE]
        starter_cnt = counts[SubscriptionPlan.STARTER]
        pro_cnt = counts[SubscriptionPlan.PRO]
        enterprise_cnt = counts[SubscriptionPlan.ENTERPRISE]
        total = free_cnt + starter_cnt + pro_cnt + enterprise_cnt

        dist = {}
        if total > 0:
            dist["FREE"] = round((free_cnt / total) * 100.0, 2)
            dist["STARTER"] = round((starter_cnt / total) * 100.0, 2)
            dist["PRO"] = round((pro_cnt / total) * 100.0, 2)
            dist["ENTERPRISE"] = round((enterprise_cnt / total) * 100.0, 2)
        else:
            dist = {"FREE": 0.0, "STARTER": 0.0, "PRO": 0.0, "ENTERPRISE": 0.0}

        return AnalyticsSubscriptionsResponse(
            free_count=free_cnt,
            starter_count=starter_cnt,
            pro_count=pro_cnt,
            enterprise_count=enterprise_cnt,
            total=total,
            percentage_distribution=dist,
        )

    def get_analytics_ai_usage(self) -> AnalyticsAIUsageResponse:
        total_ai_executions = self.db.scalar(select(func.count(AIJob.id))) or 0

        queued_jobs = self.db.scalar(
            select(func.count(AIJob.id)).filter(AIJob.status == AIJobStatus.QUEUED)
        ) or 0
        running_jobs = self.db.scalar(
            select(func.count(AIJob.id)).filter(AIJob.status == AIJobStatus.RUNNING)
        ) or 0
        completed_jobs = self.db.scalar(
            select(func.count(AIJob.id)).filter(AIJob.status == AIJobStatus.COMPLETED)
        ) or 0
        failed_jobs = self.db.scalar(
            select(func.count(AIJob.id)).filter(AIJob.status == AIJobStatus.FAILED)
        ) or 0

        type_rows = self.db.execute(
            select(AIJob.type, func.count(AIJob.id)).group_by(AIJob.type)
        ).all()
        by_type = {job_type: count for job_type, count in type_rows}

        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        executions_this_month = self.db.scalar(
            select(func.count(AIJob.id)).filter(AIJob.created_at >= month_start)
        ) or 0

        return AnalyticsAIUsageResponse(
            total_ai_executions=total_ai_executions,
            queued_jobs=queued_jobs,
            running_jobs=running_jobs,
            completed_jobs=completed_jobs,
            failed_jobs=failed_jobs,
            executions_by_type=by_type,
            executions_this_month=executions_this_month,
        )

    def list_enterprise_requests(
        self,
        page: int = 1,
        limit: int = 20,
        status_filter: str | None = None,
    ) -> dict[str, Any]:
        """Lists all Enterprise requests across organizations for Super Admin review."""
        query = select(EnterpriseSubscriptionRequest)
        if status_filter:
            try:
                st = EnterpriseRequestStatus(status_filter.upper())
                query = query.filter(EnterpriseSubscriptionRequest.status == st)
            except ValueError:
                pass

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0

        requests = self.db.execute(
            query.order_by(EnterpriseSubscriptionRequest.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        ).scalars().all()

        items = []
        for req in requests:
            comp = self.db.execute(
                select(Company).filter(Company.id == req.company_id)
            ).scalar_one_or_none()
            user = self.db.execute(
                select(User).filter(User.id == req.requested_by)
            ).scalar_one_or_none() if req.requested_by else None
            items.append(self._to_enterprise_detail(req, comp, user))

        pages = (total + limit - 1) // limit if total > 0 else 1
        return {
            "items": [item.model_dump() for item in items],
            "total": total,
            "page": page,
            "pages": pages,
        }

    def get_enterprise_request(self, request_id: UUID) -> EnterpriseRequestDetail:
        """Retrieves full detail of a specific Enterprise request."""
        req = self.db.execute(
            select(EnterpriseSubscriptionRequest).filter(
                EnterpriseSubscriptionRequest.id == request_id
            )
        ).scalar_one_or_none()

        if not req:
            raise ResourceNotFound("Enterprise subscription request not found.")

        comp = self.db.execute(
            select(Company).filter(Company.id == req.company_id)
        ).scalar_one_or_none()
        user = self.db.execute(
            select(User).filter(User.id == req.requested_by)
        ).scalar_one_or_none() if req.requested_by else None

        return self._to_enterprise_detail(req, comp, user)

    def calculate_enterprise_price_preview(
        self,
        limits: EnterpriseResourceLimits,
        capabilities: list[str],
    ) -> CalculatePriceResponse:
        """Calculates dynamic price and breakdown preview based on limits and capabilities."""
        pricing = calculate_enterprise_pricing(limits.model_dump(), capabilities)
        return CalculatePriceResponse(**pricing)

    def approve_enterprise_request(
        self,
        request_id: UUID,
        payload: ApproveEnterpriseRequest,
        admin_user: User,
    ) -> EnterpriseRequestDetail:
        """
        Super Admin approves an Enterprise subscription request:
        1. Computes authoritative dynamic price and itemized breakdown.
        2. Persists permanent snapshot of approved limits, capabilities, breakdown, and version.
        3. Transitions status directly to PAYMENT_PENDING.
        4. Notifies the organization CTO with deep link to Billing.
        """
        req = self.db.execute(
            select(EnterpriseSubscriptionRequest)
            .filter(EnterpriseSubscriptionRequest.id == request_id)
            .with_for_update()
        ).scalar_one_or_none()

        if not req:
            raise ResourceNotFound("Enterprise subscription request not found.")

        if req.status not in (EnterpriseRequestStatus.PENDING, EnterpriseRequestStatus.UNDER_REVIEW):
            raise BaseBusinessException(
                f"Cannot approve request currently in status '{req.status.value}'.",
                status_code=400,
            )

        # Authoritative server-side pricing
        limits_dict = payload.adjusted_limits.model_dump()
        pricing = calculate_enterprise_pricing(limits_dict, payload.approved_capabilities)

        now = datetime.now(timezone.utc)
        req.approved_limits = limits_dict
        req.approved_capabilities = payload.approved_capabilities
        req.calculated_price = pricing["total_monthly_price"]
        req.price_breakdown = pricing
        req.pricing_version = pricing["pricing_version"]
        req.admin_comment = payload.admin_comment
        req.status = EnterpriseRequestStatus.PAYMENT_PENDING
        req.approved_at = now

        # Notify CTO
        comp = self.db.execute(
            select(Company).filter(Company.id == req.company_id)
        ).scalar_one_or_none()

        recipient_id = req.requested_by
        if not recipient_id and comp:
            owner = self.db.execute(
                select(User).filter(User.company_id == comp.id, User.role == "OWNER")
            ).scalars().first()
            if owner:
                recipient_id = owner.id

        if recipient_id:
            notif = Notification(
                recipient_user_id=recipient_id,
                company_id=req.company_id,
                type=NotificationType.ENTERPRISE_REQUEST_APPROVED,
                title="Enterprise Plan Request Approved",
                message=(
                    f"Your Enterprise plan request has been approved at ₹{pricing['total_monthly_price']:,} / month. "
                    "Please review the approved configuration and proceed to payment to activate your subscription."
                ),
                source_type="ENTERPRISE_REQUEST",
                source_id=req.id,
                deep_link="/company/settings",
                is_read=False,
            )
            self.db.add(notif)

        self.db.commit()
        self.db.refresh(req)

        requester = self.db.execute(
            select(User).filter(User.id == req.requested_by)
        ).scalar_one_or_none() if req.requested_by else None

        return self._to_enterprise_detail(req, comp, requester)

    def reject_enterprise_request(
        self,
        request_id: UUID,
        payload: RejectEnterpriseRequest,
        admin_user: User,
    ) -> EnterpriseRequestDetail:
        """
        Super Admin rejects an Enterprise subscription request with a required reason.
        Transitions status to REJECTED and notifies the CTO.
        """
        req = self.db.execute(
            select(EnterpriseSubscriptionRequest)
            .filter(EnterpriseSubscriptionRequest.id == request_id)
            .with_for_update()
        ).scalar_one_or_none()

        if not req:
            raise ResourceNotFound("Enterprise subscription request not found.")

        if req.status not in (EnterpriseRequestStatus.PENDING, EnterpriseRequestStatus.UNDER_REVIEW):
            raise BaseBusinessException(
                f"Cannot reject request currently in status '{req.status.value}'.",
                status_code=400,
            )

        now = datetime.now(timezone.utc)
        req.status = EnterpriseRequestStatus.REJECTED
        req.admin_comment = payload.admin_comment
        req.rejected_at = now

        comp = self.db.execute(
            select(Company).filter(Company.id == req.company_id)
        ).scalar_one_or_none()

        recipient_id = req.requested_by
        if not recipient_id and comp:
            owner = self.db.execute(
                select(User).filter(User.company_id == comp.id, User.role == "OWNER")
            ).scalars().first()
            if owner:
                recipient_id = owner.id

        if recipient_id:
            notif = Notification(
                recipient_user_id=recipient_id,
                company_id=req.company_id,
                type=NotificationType.ENTERPRISE_REQUEST_REJECTED,
                title="Enterprise Plan Request Declined",
                message=f"Your Enterprise plan request was declined. Reason: {payload.admin_comment}",
                source_type="ENTERPRISE_REQUEST",
                source_id=req.id,
                deep_link="/company/settings",
                is_read=False,
            )
            self.db.add(notif)

        self.db.commit()
        self.db.refresh(req)

        requester = self.db.execute(
            select(User).filter(User.id == req.requested_by)
        ).scalar_one_or_none() if req.requested_by else None

        return self._to_enterprise_detail(req, comp, requester)

    def _to_enterprise_detail(
        self,
        req: EnterpriseSubscriptionRequest,
        company: Company | None,
        user: User | None,
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

