from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.models.enums import TaskStatus, TaskPriority, ProjectRole
from app.tasks.repository import TaskRepository
from app.tasks.schemas import (
    CreateTaskRequest,
    UpdateTaskRequest,
    UpdateTaskStatusRequest,
    TaskResponse,
    TaskListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException
from app.permissions.dependencies import check_project_role_or_company_admin


class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskRepository(db)

    def _build_task_response(self, task: Task) -> TaskResponse:
        assignee_name = None
        if task.assignee:
            assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}"

        return TaskResponse(
            id=task.id,
            project_id=task.project_id,
            sprint_id=task.sprint_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            assignee_id=task.assignee_id,
            assignee_name=assignee_name,
            created_by=task.created_by,
            created_at=task.created_at,
        )

    def list_tasks(self, project_id: UUID, current_user: User, sprint_id: UUID | None = None) -> TaskListResponse:
        project = self.db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
        if not project:
            raise ResourceNotFound("Project not found.")

        if str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this project.")

        tasks = self.repo.get_tasks_by_project(project_id, sprint_id)
        responses = [self._build_task_response(t) for t in tasks]
        return TaskListResponse(tasks=responses, total=len(responses))

    def create_task(self, project_id: UUID, data: CreateTaskRequest, current_user: User) -> TaskResponse:
        project = check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]
        )

        try:
            status_enum = TaskStatus(data.status)
        except ValueError:
            status_enum = TaskStatus.TODO

        try:
            priority_enum = TaskPriority(data.priority)
        except ValueError:
            priority_enum = TaskPriority.MEDIUM

        try:
            task = Task(
                project_id=project_id,
                sprint_id=data.sprint_id,
                title=data.title,
                description=data.description,
                status=status_enum,
                priority=priority_enum,
                assignee_id=data.assignee_id,
                created_by=current_user.id,
            )
            self.repo.create_task(task)
            self.db.commit()

            return self._build_task_response(task)
        except Exception as e:
            self.db.rollback()
            raise e

    def update_task_status(self, task_id: UUID, data: UpdateTaskStatusRequest, current_user: User) -> TaskResponse:
        task = self.repo.get_task_by_id(task_id)
        if not task:
            raise ResourceNotFound("Task not found.")

        # Allow assigned user or creator to update status, or users passing PM/TL/Admin RBAC check
        is_assignee_or_creator = (
            (task.assignee_id and str(task.assignee_id) == str(current_user.id)) or
            (task.created_by and str(task.created_by) == str(current_user.id))
        )

        if not is_assignee_or_creator:
            check_project_role_or_company_admin(
                self.db, current_user, task.project_id, [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]
            )
        else:
            project = self.db.execute(select(Project).filter(Project.id == task.project_id)).scalar_one_or_none()
            if not project or str(project.company_id) != str(current_user.company_id):
                raise Forbidden("You do not have access to this task.")

        try:
            status_enum = TaskStatus(data.status)
        except ValueError:
            raise BaseBusinessException("Invalid task status value.", status_code=400)

        try:
            task.status = status_enum
            self.db.commit()
            return self._build_task_response(task)
        except Exception as e:
            self.db.rollback()
            raise e

    def get_task(self, task_id: UUID, current_user: User) -> TaskResponse:
        """
        Retrieves a single task by ID, scoped to the current user's company.
        """
        task = self.repo.get_task_by_id(task_id)
        if not task:
            raise ResourceNotFound("Task not found.")

        project = self.db.execute(select(Project).filter(Project.id == task.project_id)).scalar_one_or_none()
        if not project or str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this task.")

        return self._build_task_response(task)

    def update_task(self, task_id: UUID, data: UpdateTaskRequest, current_user: User) -> TaskResponse:
        """
        Partially updates task fields: title, description, status, priority, assignee.
        Requires PROJECT_MANAGER, TEAM_LEAD, or Company OWNER/ADMIN.
        """
        task = self.repo.get_task_by_id(task_id)
        if not task:
            raise ResourceNotFound("Task not found.")

        check_project_role_or_company_admin(
            self.db, current_user, task.project_id, [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]
        )

        try:
            if data.title is not None:
                task.title = data.title
            if data.description is not None:
                task.description = data.description
            if data.status is not None:
                try:
                    task.status = TaskStatus(data.status)
                except ValueError:
                    raise BaseBusinessException("Invalid task status value.", status_code=400)
            if data.priority is not None:
                try:
                    task.priority = TaskPriority(data.priority)
                except ValueError:
                    raise BaseBusinessException("Invalid task priority value.", status_code=400)
            if data.assignee_id is not None:
                task.assignee_id = data.assignee_id

            self.db.commit()
            return self._build_task_response(task)
        except Exception as e:
            self.db.rollback()
            raise e

    def delete_task(self, task_id: UUID, current_user: User) -> None:
        """
        Deletes a task by ID.
        Requires PROJECT_MANAGER, TEAM_LEAD, or Company OWNER/ADMIN.
        Automatic cross-tenant access rejection via check_project_role_or_company_admin.
        """
        task = self.repo.get_task_by_id(task_id)
        if not task:
            raise ResourceNotFound("Task not found.")

        check_project_role_or_company_admin(
            self.db, current_user, task.project_id, [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]
        )

        try:
            self.db.delete(task)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
