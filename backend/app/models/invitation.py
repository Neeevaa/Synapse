from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ProjectRole, Specialization, InvitationStatus

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.project import Project
    from app.models.user import User


class Invitation(BaseModel):
    __tablename__ = "invitations"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    project_role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole),
        default=ProjectRole.DEVELOPER,
        nullable=False,
    )

    specialization: Mapped[Specialization | None] = mapped_column(
        Enum(Specialization),
        nullable=True,
    )

    personal_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    token_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )

    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus),
        default=InvitationStatus.PENDING,
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    company = relationship(
        "Company",
        back_populates="invitations",
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )

    inviter = relationship(
        "User",
        foreign_keys=[created_by],
    )