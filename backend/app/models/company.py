from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import SubscriptionPlan


class Company(BaseModel):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    default_project_visibility: Mapped[str] = mapped_column(
        String(50),
        default="PRIVATE",
    )

    subscription_plan: Mapped[SubscriptionPlan] = mapped_column(
        Enum(SubscriptionPlan),
        default=SubscriptionPlan.FREE,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    users = relationship(
        "User",
        back_populates="company",
        cascade="all, delete",
    )

    projects = relationship(
        "Project",
        back_populates="company",
        cascade="all, delete",
    )

    invitations = relationship(
        "Invitation",
        back_populates="company",
        cascade="all, delete",
    )