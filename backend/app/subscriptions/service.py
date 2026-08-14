from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.ai_job import AIJob
from app.models.user_activity import UserActivity
from app.models.company_resource import CompanyResourceAllocation
from app.models.enums import SubscriptionPlan, ProjectStatus
from app.subscriptions.entitlements import (
    SubscriptionEntitlements,
    PLAN_ENTITLEMENTS_MAP,
    FREE_ENTITLEMENTS,
)
from app.common.exceptions import ResourceNotFound, BaseBusinessException


class EntitlementService:
    def __init__(self, db: Session):
        self.db = db

    def get_effective_entitlements(self, company_id: UUID) -> SubscriptionEntitlements:
        company = self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

        if not company:
            raise ResourceNotFound("Company not found.")

        base = PLAN_ENTITLEMENTS_MAP.get(company.subscription_plan, FREE_ENTITLEMENTS)

        alloc = self.db.execute(
            select(CompanyResourceAllocation).filter(
                CompanyResourceAllocation.company_id == company.id
            )
        ).scalar_one_or_none()

        max_users = base.max_users
        max_active_projects = base.max_active_projects
        max_storage_bytes = base.max_storage_bytes
        max_ai_executions = base.max_ai_executions
        max_automation_workflows = base.max_automation_workflows
        enabled_features = set(base.enabled_features)

        if alloc:
            if alloc.custom_max_users is not None:
                max_users = alloc.custom_max_users
            if alloc.custom_max_projects is not None:
                max_active_projects = alloc.custom_max_projects
            if alloc.custom_max_storage_bytes is not None:
                max_storage_bytes = alloc.custom_max_storage_bytes
            if alloc.custom_max_ai_executions is not None:
                max_ai_executions = alloc.custom_max_ai_executions
            if alloc.custom_max_automation_workflows is not None:
                max_automation_workflows = alloc.custom_max_automation_workflows
            if alloc.custom_features is not None:
                enabled_features = set(alloc.custom_features)

        return SubscriptionEntitlements(
            plan=company.subscription_plan,
            max_users=max_users,
            max_active_projects=max_active_projects,
            max_storage_bytes=max_storage_bytes,
            max_ai_executions=max_ai_executions,
            max_automation_workflows=max_automation_workflows,
            enabled_features=enabled_features,
        )

    def get_company_warnings(self, company_id: UUID) -> list[str]:
        effective = self.get_effective_entitlements(company_id)
        warnings = []

        if effective.max_users != -1:
            user_count = self.db.scalar(
                select(func.count(User.id)).filter(User.company_id == company_id)
            ) or 0
            if user_count > effective.max_users:
                warnings.append(
                    f"Current user count ({user_count}) exceeds plan limit ({effective.max_users}). New user creation is blocked until usage is within limit."
                )

        if effective.max_active_projects != -1:
            project_count = self.db.scalar(
                select(func.count(Project.id)).filter(
                    Project.company_id == company_id, Project.status == ProjectStatus.ACTIVE
                )
            ) or 0
            if project_count > effective.max_active_projects:
                warnings.append(
                    f"Active project count ({project_count}) exceeds plan limit ({effective.max_active_projects}). New project creation is blocked."
                )

        if effective.max_ai_executions != -1:
            ai_used = self.db.scalar(
                select(func.count(AIJob.id)).filter(
                    AIJob.project_id.in_(
                        select(Project.id).filter(Project.company_id == company_id)
                    )
                )
            ) or 0
            if ai_used > effective.max_ai_executions:
                warnings.append(
                    f"AI execution count ({ai_used}) exceeds plan limit ({effective.max_ai_executions}). Further AI executions are blocked."
                )

        return warnings

    def check_user_limit(self, company_id: UUID) -> None:
        effective = self.get_effective_entitlements(company_id)
        if effective.max_users == -1:
            return

        current_users = self.db.scalar(
            select(func.count(User.id)).filter(User.company_id == company_id)
        ) or 0

        if current_users >= effective.max_users:
            raise BaseBusinessException(
                f"Subscription limit reached: maximum user count for your plan ({effective.max_users}) has been exceeded.",
                status_code=403,
            )

    def check_project_limit(self, company_id: UUID) -> None:
        effective = self.get_effective_entitlements(company_id)
        if effective.max_active_projects == -1:
            return

        active_projects = self.db.scalar(
            select(func.count(Project.id)).filter(
                Project.company_id == company_id, Project.status == ProjectStatus.ACTIVE
            )
        ) or 0

        if active_projects >= effective.max_active_projects:
            raise BaseBusinessException(
                f"Subscription limit reached: maximum active project count for your plan ({effective.max_active_projects}) has been exceeded.",
                status_code=403,
            )

    def check_ai_execution_limit(self, company_id: UUID) -> None:
        effective = self.get_effective_entitlements(company_id)
        if effective.max_ai_executions == -1:
            return

        ai_executions_used = self.db.scalar(
            select(func.count(AIJob.id)).filter(
                AIJob.project_id.in_(
                    select(Project.id).filter(Project.company_id == company_id)
                )
            )
        ) or 0

        if ai_executions_used >= effective.max_ai_executions:
            raise BaseBusinessException(
                f"Subscription limit reached: maximum AI quota for your plan ({effective.max_ai_executions}) has been exceeded.",
                status_code=403,
            )

    def check_automation_limit(self, company_id: UUID) -> None:
        effective = self.get_effective_entitlements(company_id)
        if effective.max_automation_workflows == -1:
            return

        if effective.max_automation_workflows == 0:
            raise BaseBusinessException(
                "Subscription limit reached: automations are not included in your current subscription plan.",
                status_code=403,
            )

        automations_used = self.db.scalar(
            select(func.count(UserActivity.id)).filter(
                UserActivity.company_id == company_id
            )
        ) or 0

        if automations_used >= effective.max_automation_workflows:
            raise BaseBusinessException(
                f"Subscription limit reached: maximum automation workflows for your plan ({effective.max_automation_workflows}) has been exceeded.",
                status_code=403,
            )

    def check_storage_limit(self, company_id: UUID, new_file_bytes: int = 0) -> None:
        effective = self.get_effective_entitlements(company_id)
        if effective.max_storage_bytes == -1:
            return

        storage_used = 0  # Actual stored bytes
        if storage_used + new_file_bytes > effective.max_storage_bytes:
            mb_limit = effective.max_storage_bytes // (1024 * 1024)
            raise BaseBusinessException(
                f"Subscription limit reached: storage quota for your plan ({mb_limit} MB) has been exceeded.",
                status_code=403,
            )

    def check_feature_entitlement(self, company_id: UUID, feature_code: str) -> None:
        effective = self.get_effective_entitlements(company_id)
        if feature_code not in effective.enabled_features:
            raise BaseBusinessException(
                f"Feature '{feature_code}' is not included in your subscription plan.",
                status_code=403,
            )
