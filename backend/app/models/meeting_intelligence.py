from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime, Enum, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.enums import (
    RequirementReviewStatus,
    TaskWorkstream,
    TaskPriority,
    FindingHumanDecision,
)


class MeetingAnalysis(Base):
    __tablename__ = "meeting_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ai_job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ai_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status = Column(
        Enum(RequirementReviewStatus),
        nullable=False,
        default=RequirementReviewStatus.QUEUED,
        index=True,
    )
    model_name = Column(String(100), nullable=False, default="mock-deterministic-v1")
    prompt_version = Column(String(100), nullable=False, default="MEETING_INTELLIGENCE_PROMPT_V1")

    summary = Column(Text, nullable=True)
    decisions = Column(JSON, nullable=True, default=list)
    risks = Column(JSON, nullable=True, default=list)

    retrieved_chunk_ids = Column(JSON, nullable=True)
    similarity_scores = Column(JSON, nullable=True)

    retrieval_latency_ms = Column(Float, nullable=False, default=0.0)
    generation_latency_ms = Column(Float, nullable=False, default=0.0)
    total_latency_ms = Column(Float, nullable=False, default=0.0)

    raw_output_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    meeting = relationship("Meeting", backref="analyses")
    project = relationship("Project", backref="meeting_analyses")
    company = relationship("Company", backref="meeting_analyses")
    ai_job = relationship("AIJob", foreign_keys=[ai_job_id])

    task_suggestions = relationship(
        "MeetingTaskSuggestion",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )


class MeetingTaskSuggestion(Base):
    __tablename__ = "meeting_task_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    analysis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meeting_analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    workstream = Column(Enum(TaskWorkstream), nullable=False, default=TaskWorkstream.GENERAL)
    priority = Column(Enum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM)
    story_points = Column(Integer, nullable=True, default=1)

    requirement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirements.id", ondelete="SET NULL"),
        nullable=True,
    )

    human_decision = Column(
        Enum(FindingHumanDecision),
        nullable=False,
        default=FindingHumanDecision.PENDING,
        index=True,
    )
    human_comment = Column(Text, nullable=True)

    created_task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    analysis = relationship("MeetingAnalysis", back_populates="task_suggestions")
    meeting = relationship("Meeting", foreign_keys=[meeting_id])
    project = relationship("Project", foreign_keys=[project_id])
    company = relationship("Company", foreign_keys=[company_id])
    requirement = relationship("Requirement", foreign_keys=[requirement_id])
    created_task = relationship("Task", foreign_keys=[created_task_id])
    updater = relationship("User", foreign_keys=[updated_by])
