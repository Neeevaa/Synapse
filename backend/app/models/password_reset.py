import secrets
from datetime import datetime, timedelta

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class PasswordResetToken(BaseModel):
    __tablename__ = "password_reset_tokens"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )

    token: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        default=lambda: secrets.token_urlsafe(48),
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.utcnow() + timedelta(hours=2),
    )