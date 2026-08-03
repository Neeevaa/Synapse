from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.sprint import Sprint
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.enums import TaskStatus, SprintStatus
from app.sprints.repository import SprintRepository
from app.sprints.schemas import (
    CreateSprintRequest,
    UpdateSprintRequest,
    SprintResponse,
    SprintListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException


class SprintService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SprintRepository(db)

    def _build_sprint_response(self, sprint: Sprint) -> SprintResponse:
        total = self.db.scalar(
            select(func.count(Task.id)).filter(Task.sprint_id == sprint.id)
        ) or 0

        completed = self.db.scalar(
            select(func.count(Task.id)).filter(
                Task.sprint_id == sprint.id,
                Task.status == TaskStatus.DONE,
            )
        ) or 0

        return SprintResponse(
            id=sprint.id,
            project_id=sprint.project_id,
            name=sprint.name,
            goal=sprint.goal,
            status=sprint.status,
            start_date=sprint.start_date,
            end_date=sprint.end_date,
            total_tasks=total,
            completed_tasks=completed,
            created_at=sprint.created_at,
        )

    def list_sprints(self, project_id: UUID, current_user: User) -> SprintListResponse:
        project = self.db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
        if not project:
            raise ResourceNotFound("Project not found.")

        if str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this project.")

        sprints = self.repo.get_sprints_by_project(project_id)
        responses = [self._build_sprint_response(s) for s in sprints]
        return SprintListResponse(sprints=responses, total=len(responses))

    def get_active_sprint(self, project_id: UUID, current_user: User) -> SprintResponse:
        project = self.db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
        if not project:
            raise ResourceNotFound("Project not found.")

        if str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this project.")

        sprint = self.repo.get_active_sprint(project_id)
        if not sprint:
            # Auto-create a default active sprint if none exists
            sprint = Sprint(
                project_id=project_id,
                name="Sprint 1",
                goal="Initial Project Sprint",
            )
            self.repo.create_sprint(sprint)
            self.db.commit()

        return self._build_sprint_response(sprint)

    def create_sprint(self, project_id: UUID, data: CreateSprintRequest, current_user: User) -> SprintResponse:
        project = self.db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
        if not project:
            raise ResourceNotFound("Project not found.")

        if str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this project.")

        try:
            sprint = Sprint(
                project_id=project_id,
                name=data.name,
                goal=data.goal,
                start_date=data.start_date,
                end_date=data.end_date,
            )
            self.repo.create_sprint(sprint)
            self.db.commit()

            return self._build_sprint_response(sprint)
        except Exception as e:
            self.db.rollback()
            raise e

    def update_sprint(self, sprint_id: UUID, data: UpdateSprintRequest, current_user: User) -> SprintResponse:
        sprint = self.repo.get_sprint_by_id(sprint_id)
        if not sprint:
            raise ResourceNotFound("Sprint not found.")

        project = self.db.execute(select(Project).filter(Project.id == sprint.project_id)).scalar_one_or_none()
        if not project or str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this sprint.")

        try:
            if data.name is not None:
                sprint.name = data.name
            if data.goal is not None:
                sprint.goal = data.goal
            if data.status is not None:
                try:
                    sprint.status = SprintStatus(data.status)
                except ValueError:
                    raise BaseBusinessException("Invalid sprint status value.", status_code=400)
            if data.start_date is not None:
                sprint.start_date = data.start_date
            if data.end_date is not None:
                sprint.end_date = data.end_date

            # Cross-check existing vs updated dates
            if sprint.start_date and sprint.end_date and sprint.end_date <= sprint.start_date:
                raise BaseBusinessException("Sprint end_date must be strictly after start_date.", status_code=400)

            self.db.commit()
            return self._build_sprint_response(sprint)
        except Exception as e:
            self.db.rollback()
            raise e
