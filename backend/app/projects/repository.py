from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.models.enums import CompanyRole


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

    def get_projects_for_user(self, user: User) -> list[Project]:
        """
        Retrieves projects accessible to a user:
        - Company OWNER / ADMIN: All projects belonging to the company.
        - Non-admin user: Only projects where user is an active ProjectMember.
        """
        if user.role in (CompanyRole.OWNER, CompanyRole.ADMIN):
            stmt = (
                select(Project)
                .filter(Project.company_id == user.company_id)
                .order_by(Project.created_at.desc())
            )
        else:
            stmt = (
                select(Project)
                .join(ProjectMember, ProjectMember.project_id == Project.id)
                .filter(
                    Project.company_id == user.company_id,
                    ProjectMember.user_id == user.id,
                )
                .order_by(Project.created_at.desc())
            )

        result = self.db.execute(stmt)
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
