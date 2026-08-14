from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_tasks_by_project(self, project_id: UUID, sprint_id: UUID | None = None, workstream: str | None = None) -> list[Task]:
        """
        Queries tasks for a project, optionally filtered by sprint and workstream.
        """
        stmt = select(Task).filter(Task.project_id == project_id)
        if sprint_id is not None:
            stmt = stmt.filter(Task.sprint_id == sprint_id)
        if workstream is not None:
            stmt = stmt.filter(Task.workstream == workstream)
        stmt = stmt.order_by(Task.created_at.desc())

        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def get_task_by_id(self, task_id: UUID) -> Task | None:
        """
        Queries a task by ID.
        """
        return self.db.execute(
            select(Task).filter(Task.id == task_id)
        ).scalar_one_or_none()

    def create_task(self, task: Task) -> Task:
        """
        Adds a new task to the database.
        """
        self.db.add(task)
        self.db.flush()
        return task

    def get_backlog_tasks(self, project_id: UUID, workstream: str | None = None) -> list[Task]:
        """
        Queries unassigned tasks (sprint_id IS NULL) for a project ordered by position ASC, created_at ASC.
        """
        stmt = select(Task).filter(Task.project_id == project_id, Task.sprint_id.is_(None))
        if workstream is not None:
            stmt = stmt.filter(Task.workstream == workstream)
        stmt = stmt.order_by(Task.position.asc(), Task.created_at.asc())
        result = self.db.execute(stmt)
        return list(result.scalars().all())
