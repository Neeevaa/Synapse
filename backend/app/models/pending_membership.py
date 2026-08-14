from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ProjectRole, Specialization


class PendingMembership(BaseModel):
    """
    Stores a project membership invitation for an email address that
    does not yet have a Synapse account. When the user registers via
    /auth/register/member with a matching email, all pending memberships
    for that email are converted to real ProjectMember records.
    """
    __tablename__ = "pending_memberships"

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole, create_type=False),
        default=ProjectRole.DEVELOPER,
        nullable=False,
    )

    specialization: Mapped[Specialization | None] = mapped_column(
        Enum(Specialization, create_type=False),
        nullable=True,
    )

    invited_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )

    inviter = relationship(
        "User",
        foreign_keys=[invited_by],
    )
