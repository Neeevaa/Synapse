from sqlalchemy import Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ProjectRole


class ProjectMember(BaseModel):
    __tablename__ = "project_members"

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole, create_type=False),
        default=ProjectRole.DEVELOPER,
        nullable=False,
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
    )
