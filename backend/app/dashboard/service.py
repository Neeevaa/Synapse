from uuid import UUID
from datetime import datetime
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.invitation import Invitation
from app.models.enums import CompanyRole, ProjectRole, SprintStatus, TaskStatus, TaskPriority, InvitationStatus
from app.common.exceptions import ResourceNotFound, Forbidden
from app.dashboard.schemas import (
    DashboardUserContext,
    DashboardProjectItem,
    DashboardActiveProjectContext,
    DashboardMetrics,
    DashboardCapabilities,
    DashboardContextResponse,
)


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_context(self, current_user: User, project_id: UUID | None = None) -> DashboardContextResponse:
        comp_role_str = (
            current_user.role.value
            if isinstance(current_user.role, CompanyRole)
            else (str(current_user.role) if current_user.role else None)
        )

        user_ctx = DashboardUserContext(
            id=current_user.id,
            first_name=current_user.first_name or "",
            last_name=current_user.last_name or "",
            email=current_user.email,
            company_role=comp_role_str,
            is_super_admin=getattr(current_user, "is_super_admin", False),
        )

        is_company_admin = comp_role_str in ["OWNER", "ADMIN"]

        # Query explicit project memberships for current user
        pm_records = self.db.execute(
            select(ProjectMember, Project)
            .join(Project, ProjectMember.project_id == Project.id)
            .filter(ProjectMember.user_id == current_user.id)
        ).all()

        user_pm_map: dict[str, ProjectMember] = {str(pm.project_id): pm for pm, _ in pm_records}
        user_project_map: dict[str, Project] = {str(p.id): p for _, p in pm_records}

        # If company admin, also include all projects in the company
        if is_company_admin and current_user.company_id:
            company_projects = self.db.execute(
                select(Project).filter(Project.company_id == current_user.company_id)
            ).scalars().all()
            for p in company_projects:
                if str(p.id) not in user_project_map:
                    user_project_map[str(p.id)] = p

        # Build list of authorized project items
        projects_list: list[DashboardProjectItem] = []
        for p_id, proj in user_project_map.items():
            pm_rec = user_pm_map.get(p_id)
            if pm_rec:
                role_val = pm_rec.role.value if isinstance(pm_rec.role, ProjectRole) else str(pm_rec.role)
                spec_val = pm_rec.specialization.value if hasattr(pm_rec.specialization, "value") else (str(pm_rec.specialization) if pm_rec.specialization else None)
            else:
                role_val = "PROJECT_MANAGER" if is_company_admin else "DEVELOPER"
                spec_val = None

            projects_list.append(
                DashboardProjectItem(
                    project_id=proj.id,
                    project_name=proj.name,
                    project_role=role_val,
                    specialization=spec_val,
                )
            )

        # Sort project list by project_name
        projects_list.sort(key=lambda x: x.project_name.lower())

        # Resolve active project
        target_project: Project | None = None
        if project_id:
            target_str = str(project_id)
            if target_str not in user_project_map:
                # Check if project exists in company
                p_obj = self.db.execute(select(Project).filter(Project.id == project_id)).scalars().first()
                if not p_obj or str(p_obj.company_id) != str(current_user.company_id):
                    raise Forbidden("You do not have access to this project.")
                if not is_company_admin:
                    raise Forbidden("You do not have access to this project.")
                target_project = p_obj
            else:
                target_project = user_project_map[target_str]
        elif projects_list:
            target_project = user_project_map[str(projects_list[0].project_id)]

        if not target_project:
            # No authorized projects exist for user
            return DashboardContextResponse(
                user=user_ctx,
                projects=[],
                active_project=None,
                metrics=DashboardMetrics(),
                capabilities=DashboardCapabilities(
                    can_view_team=is_company_admin,
                    can_manage_members=is_company_admin,
                    can_assign_tasks=is_company_admin,
                    can_manage_sprints=is_company_admin,
                    can_edit_tasks=is_company_admin,
                    can_view_reports=is_company_admin,
                    is_read_only=not is_company_admin,
                ),
            )

        # Active project member details
        active_pm_rec = user_pm_map.get(str(target_project.id))
        if active_pm_rec:
            active_role = active_pm_rec.role.value if isinstance(active_pm_rec.role, ProjectRole) else str(active_pm_rec.role)
            active_spec = active_pm_rec.specialization.value if hasattr(active_pm_rec.specialization, "value") else (str(active_pm_rec.specialization) if active_pm_rec.specialization else None)
        else:
            active_role = "PROJECT_MANAGER" if is_company_admin else "DEVELOPER"
            active_spec = None

        company_name = target_project.company.name if target_project.company else "Company"

        active_ctx = DashboardActiveProjectContext(
            project_id=target_project.id,
            project_name=target_project.name,
            company_name=company_name,
            project_role=active_role,
            specialization=active_spec,
        )

        # Calculate capabilities explicitly from server-side rules
        is_pm = is_company_admin or active_role == "PROJECT_MANAGER"
        is_tl = is_pm or active_role == "TEAM_LEAD"
        is_dev = is_tl or active_role == "DEVELOPER"
        is_viewer = active_role == "VIEWER" and not is_company_admin and not is_pm and not is_tl and not is_dev

        capabilities = DashboardCapabilities(
            can_view_team=True,
            can_manage_members=is_pm,
            can_manage_sprints=is_pm,
            can_assign_tasks=is_tl,
            can_edit_tasks=is_dev or is_tl or is_pm,
            can_view_reports=True,
            is_read_only=is_viewer,
        )

        # Compute real project metrics
        # 1. My tasks (assigned to current user in active project)
        my_tasks_stmt = select(Task).filter(
            Task.project_id == target_project.id,
            Task.assignee_id == current_user.id,
            Task.status != TaskStatus.DONE,
            Task.status != TaskStatus.CANCELLED,
        )
        my_tasks_list = list(self.db.execute(my_tasks_stmt).scalars().all())
        my_tasks_count = len(my_tasks_list)
        story_points_sum = sum(t.story_points or 0 for t in my_tasks_list)

        # 2. Overdue or Urgent tasks assigned to user
        overdue_count = sum(1 for t in my_tasks_list if t.priority == TaskPriority.URGENT)

        # 3. Active Sprint details
        active_sprint = self.db.execute(
            select(Sprint)
            .filter(
                Sprint.project_id == target_project.id,
                Sprint.status == SprintStatus.ACTIVE,
            )
            .order_by(Sprint.created_at.desc())
        ).scalars().first()

        sprint_progress_percent = 0
        active_sprint_name = None
        blocked_tasks_count = 0

        if active_sprint:
            active_sprint_name = active_sprint.name
            sprint_tasks = list(
                self.db.execute(select(Task).filter(Task.sprint_id == active_sprint.id)).scalars().all()
            )
            total_sprint_tasks = len(sprint_tasks)
            completed_sprint_tasks = sum(1 for t in sprint_tasks if t.status == TaskStatus.DONE)
            if total_sprint_tasks > 0:
                sprint_progress_percent = int((completed_sprint_tasks / total_sprint_tasks) * 100)

            blocked_tasks_count = sum(
                1 for t in sprint_tasks if t.priority == TaskPriority.URGENT or t.status == TaskStatus.TODO
            )

        # 4. Total project tasks count
        total_proj_tasks = self.db.scalar(
            select(func.count(Task.id)).filter(Task.project_id == target_project.id)
        ) or 0

        completed_proj_tasks = self.db.scalar(
            select(func.count(Task.id)).filter(
                Task.project_id == target_project.id,
                Task.status == TaskStatus.DONE,
            )
        ) or 0

        # 5. Pending invitations count
        pending_inv_count = self.db.scalar(
            select(func.count(Invitation.id)).filter(
                Invitation.project_id == target_project.id,
                Invitation.status == InvitationStatus.PENDING,
            )
        ) or 0

        metrics = DashboardMetrics(
            my_tasks=my_tasks_count,
            overdue_tasks=overdue_count,
            story_points=story_points_sum,
            sprint_progress_percent=sprint_progress_percent,
            active_sprint_name=active_sprint_name,
            blocked_tasks_count=blocked_tasks_count,
            pending_invitations_count=pending_inv_count,
            total_project_tasks=total_proj_tasks,
            completed_project_tasks=completed_proj_tasks,
        )

        return DashboardContextResponse(
            user=user_ctx,
            projects=projects_list,
            active_project=active_ctx,
            metrics=metrics,
            capabilities=capabilities,
        )
