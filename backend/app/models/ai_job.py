from datetime import datetime
from sqlalchemy import Enum, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import AIJobStatus


class AIJob(BaseModel):
    """
    Tracks status of background AI processing jobs (Requirements Review,
    Meeting Summaries, Test Case Generation, Delay Predictions, etc.).
    """
    __tablename__ = "ai_jobs"

    project_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )

    type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    status: Mapped[AIJobStatus] = mapped_column(
        Enum(AIJobStatus, name="aijobstatus"),
        default=AIJobStatus.QUEUED,
        nullable=False,
    )

    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    result_metadata: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
    )

    finished_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )

    creator = relationship(
        "User",
        foreign_keys=[created_by],
    )
