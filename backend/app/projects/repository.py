from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_projects_by_company(self, company_id: UUID) -> list[Project]:
        """
        Retrieves all projects belonging to a specific company.
        """
        result = self.db.execute(
            select(Project)
            .filter(Project.company_id == company_id)
            .order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    def get_project_by_id(self, project_id: UUID) -> Project | None:
        """
        Retrieves a single project by its primary key.
        """
        return self.db.execute(
            select(Project).filter(Project.id == project_id)
        ).scalar_one_or_none()

    def create_project(self, project: Project) -> Project:
        """
        Adds a new project to the session and flushes to populate its ID.
        """
        self.db.add(project)
        self.db.flush()
        return project

    def delete_project(self, project: Project) -> None:
        """
        Deletes a project record.
        """
        self.db.delete(project)
        self.db.flush()
