from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_member import ProjectMember


class ProjectMemberRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_members_by_project(self, project_id: UUID) -> list[ProjectMember]:
        """
        Queries all members in a project.
        """
        result = self.db.execute(
            select(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .order_by(ProjectMember.created_at.asc())
        )
        return list(result.scalars().all())

    def get_member(self, project_id: UUID, user_id: UUID) -> ProjectMember | None:
        """
        Queries a specific project member record.
        """
        return self.db.execute(
            select(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        ).scalar_one_or_none()

    def add_member(self, member: ProjectMember) -> ProjectMember:
        """
        Adds a new project member.
        """
        self.db.add(member)
        self.db.flush()
        return member
