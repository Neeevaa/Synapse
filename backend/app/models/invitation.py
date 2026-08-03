import secrets
from datetime import datetime, timedelta

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import ProjectRole


class Invitation(BaseModel):
    __tablename__ = "invitations"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE")
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    role: Mapped[ProjectRole] = mapped_column(
    Enum(ProjectRole)
)

    token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        default=lambda: secrets.token_urlsafe(32),
    )

    accepted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.utcnow() + timedelta(days=7),
    )

    company = relationship(
        "Company",
        back_populates="invitations",
    )