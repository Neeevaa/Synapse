from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import TaskStatus, TaskPriority


class Task(BaseModel):
    __tablename__ = "tasks"

    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    sprint_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("sprints.id", ondelete="CASCADE"),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(
        String(250),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, create_type=False),
        default=TaskStatus.TODO,
        nullable=False,
    )

    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, create_type=False),
        default=TaskPriority.MEDIUM,
        nullable=False,
    )

    assignee_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    reporter_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    reviewer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )

    sprint = relationship(
        "Sprint",
        foreign_keys=[sprint_id],
    )

    assignee = relationship(
        "User",
        foreign_keys=[assignee_id],
    )

    reporter = relationship(
        "User",
        foreign_keys=[reporter_id],
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewer_id],
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
    )
