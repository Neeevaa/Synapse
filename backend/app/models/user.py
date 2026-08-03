from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import CompanyRole


class User(BaseModel):
    __tablename__ = "users"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE")
    )

    first_name: Mapped[str] = mapped_column(
        String(100)
    )

    last_name: Mapped[str] = mapped_column(
        String(100)
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    oauth_provider: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    oauth_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    role: Mapped[CompanyRole] = mapped_column(
        Enum(CompanyRole),
        default=CompanyRole.ADMIN,
    )

    designation: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    profile_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    company = relationship(
        "Company",
        back_populates="users",
    )