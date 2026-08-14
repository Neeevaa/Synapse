from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import SprintStatus


class Sprint(BaseModel):
    __tablename__ = "sprints"

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    goal: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[SprintStatus] = mapped_column(
        Enum(SprintStatus),
        default=SprintStatus.PLANNED,
        nullable=False,
    )

    capacity: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )
