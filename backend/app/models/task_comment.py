from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class TaskComment(BaseModel):
    """
    Stores individual task comments posted by team members.
    Enables rich audit history and AI thread analysis.
    """
    __tablename__ = "task_comments"

    task_id: Mapped[UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    task = relationship(
        "Task",
        foreign_keys=[task_id],
    )

    author = relationship(
        "User",
        foreign_keys=[user_id],
    )
