from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sprint import Sprint
from app.models.enums import SprintStatus


class SprintRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_sprints_by_project(self, project_id: UUID) -> list[Sprint]:
        """
        Retrieves all sprints for a project.
        """
        result = self.db.execute(
            select(Sprint)
            .filter(Sprint.project_id == project_id)
            .order_by(Sprint.created_at.desc())
        )
        return list(result.scalars().all())

    def get_active_sprint(self, project_id: UUID) -> Sprint | None:
        """
        Queries the active sprint for a project.
        """
        return self.db.execute(
            select(Sprint).filter(
                Sprint.project_id == project_id,
                Sprint.status == SprintStatus.ACTIVE,
            ).order_by(Sprint.created_at.desc())
        ).scalars().first()

    def get_sprint_by_id(self, sprint_id: UUID) -> Sprint | None:
        """
        Queries a sprint by ID.
        """
        return self.db.execute(
            select(Sprint).filter(Sprint.id == sprint_id)
        ).scalar_one_or_none()

    def create_sprint(self, sprint: Sprint) -> Sprint:
        """
        Adds a new sprint to the session and flushes it.
        """
        self.db.add(sprint)
        self.db.flush()
        return sprint
