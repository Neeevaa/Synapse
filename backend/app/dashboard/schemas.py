from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class DashboardUserContext(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str
    company_role: str | None = None
    is_super_admin: bool = False


class DashboardProjectItem(BaseModel):
    project_id: UUID
    project_name: str
    project_role: str
    specialization: str | None = None


class DashboardActiveProjectContext(BaseModel):
    project_id: UUID
    project_name: str
    company_name: str
    project_role: str
    specialization: str | None = None


class DashboardMetrics(BaseModel):
    my_tasks: int = 0
    overdue_tasks: int = 0
    story_points: int = 0
    sprint_progress_percent: int = 0
    active_sprint_name: str | None = None
    blocked_tasks_count: int = 0
    pending_invitations_count: int = 0
    total_project_tasks: int = 0
    completed_project_tasks: int = 0


class DashboardCapabilities(BaseModel):
    can_view_team: bool = True
    can_manage_members: bool = False
    can_assign_tasks: bool = False
    can_manage_sprints: bool = False
    can_edit_tasks: bool = False
    can_view_reports: bool = True
    is_read_only: bool = False


class DashboardContextResponse(BaseModel):
    user: DashboardUserContext
    projects: list[DashboardProjectItem]
    active_project: DashboardActiveProjectContext | None = None
    metrics: DashboardMetrics
    capabilities: DashboardCapabilities
