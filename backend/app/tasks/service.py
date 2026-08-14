from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.models.enums import TaskStatus, TaskPriority, TaskWorkstream, ProjectRole
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

        ws_str = task.workstream.value if isinstance(task.workstream, TaskWorkstream) else (str(task.workstream) if task.workstream else "GENERAL")

        return TaskResponse(
            id=task.id,
            project_id=task.project_id,
            sprint_id=task.sprint_id,
            title=task.title,
            description=task.description,
            status=task.status.value if isinstance(task.status, TaskStatus) else str(task.status),
            priority=task.priority.value if isinstance(task.priority, TaskPriority) else str(task.priority),
            workstream=ws_str,
            story_points=task.story_points,
            position=task.position or 0,
            assignee_id=task.assignee_id,
            assignee_name=assignee_name,
            created_by=task.created_by,
            created_at=task.created_at,
        )

    def _get_next_backlog_position(self, project_id: UUID) -> int:
        """
        Calculates MAX(position) + 1 for tasks in the project backlog (sprint_id IS NULL).
        Ensures newly created backlog tasks and tasks moved back from sprints append to the end.
        """
        max_pos = self.db.scalar(
            select(func.max(Task.position)).filter(
                Task.project_id == project_id,
                Task.sprint_id.is_(None),
            )
        )
        return (max_pos + 1) if max_pos is not None else 0

    def list_tasks(
        self,
        project_id: UUID,
        current_user: User,
        sprint_id: UUID | None = None,
        workstream: str | None = None,
    ) -> TaskListResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)

        if workstream is not None:
            try:
                TaskWorkstream(workstream)
            except ValueError:
                raise BaseBusinessException(
                    f"Invalid task workstream value: '{workstream}'. Allowed values: UI_UX, FRONTEND, BACKEND, QA, DEVOPS, AI_ML, GENERAL.",
                    status_code=400,
                )

        tasks = self.repo.get_tasks_by_project(project_id, sprint_id, workstream)
        responses = [self._build_task_response(t) for t in tasks]
        return TaskListResponse(tasks=responses, total=len(responses))

    def get_backlog(
        self,
        project_id: UUID,
        current_user: User,
        workstream: str | None = None,
    ) -> TaskListResponse:
        """
        Retrieves backlog items for a project (sprint_id IS NULL), ordered by position ASC, created_at ASC.
        Accessible to all project members.
        """
        project = check_project_role_or_company_admin(self.db, current_user, project_id)

        if workstream is not None:
            try:
                TaskWorkstream(workstream)
            except ValueError:
                raise BaseBusinessException(
                    f"Invalid task workstream value: '{workstream}'. Allowed values: UI_UX, FRONTEND, BACKEND, QA, DEVOPS, AI_ML, GENERAL.",
                    status_code=400,
                )

        tasks = self.repo.get_backlog_tasks(project_id, workstream)
        responses = [self._build_task_response(t) for t in tasks]
        return TaskListResponse(tasks=responses, total=len(responses))

    def reorder_backlog(self, project_id: UUID, task_ids: list[UUID], current_user: User) -> TaskListResponse:
        """
        Reorders backlog items by updating position values sequentially.
        Requires PROJECT_MANAGER, TEAM_LEAD, or Company OWNER/ADMIN.
        """
        check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]
        )

        try:
            for idx, task_id in enumerate(task_ids):
                task = self.repo.get_task_by_id(task_id)
                if task and str(task.project_id) == str(project_id):
                    task.position = idx

            self.db.commit()
            return self.get_backlog(project_id, current_user)
        except Exception as e:
            self.db.rollback()
            raise e

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

        workstream_enum = TaskWorkstream.GENERAL
        if data.workstream is not None:
            try:
                workstream_enum = TaskWorkstream(data.workstream)
            except ValueError:
                raise BaseBusinessException(
                    f"Invalid task workstream value: '{data.workstream}'. Allowed values: UI_UX, FRONTEND, BACKEND, QA, DEVOPS, AI_ML, GENERAL.",
                    status_code=400,
                )

        # Determine backlog position if creating task in backlog
        if data.sprint_id is None:
            pos = data.position if data.position is not None else self._get_next_backlog_position(project_id)
        else:
            pos = data.position or 0

        try:
            task = Task(
                project_id=project_id,
                sprint_id=data.sprint_id,
                title=data.title,
                description=data.description,
                status=status_enum,
                priority=priority_enum,
                workstream=workstream_enum,
                story_points=data.story_points,
                position=pos,
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
        Partially updates task fields: title, description, status, priority, sprint_id, story_points, position, assignee.
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
            if data.workstream is not None:
                try:
                    task.workstream = TaskWorkstream(data.workstream)
                except ValueError:
                    raise BaseBusinessException(
                        f"Invalid task workstream value: '{data.workstream}'. Allowed values: UI_UX, FRONTEND, BACKEND, QA, DEVOPS, AI_ML, GENERAL.",
                        status_code=400,
                    )
            if data.story_points is not None:
                task.story_points = data.story_points
            if data.position is not None:
                task.position = data.position
            if data.assignee_id is not None:
                task.assignee_id = data.assignee_id

            # Handle sprint assignment transitions (moving into sprint or returning to backlog)
            if data.clear_sprint:
                was_in_sprint = task.sprint_id is not None
                task.sprint_id = None
                if was_in_sprint:
                    task.position = self._get_next_backlog_position(task.project_id)
            elif data.sprint_id is not None:
                task.sprint_id = data.sprint_id

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
