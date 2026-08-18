from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime, Enum, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref

from app.models.base import Base
from app.models.enums import (
    RequirementReviewStatus,
    ReviewIssueType,
    ReviewSeverity,
    FindingEvidenceStatus,
    FindingHumanDecision,
)


class RequirementReview(Base):
    __tablename__ = "requirement_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    requirement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirement_versions.id", ondelete="CASCADE"),
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
    prompt_version = Column(String(100), nullable=False, default="REQUIREMENT_REVIEW_PROMPT_V1")

    retrieval_top_k = Column(Integer, nullable=False, default=5)
    retrieved_chunk_ids = Column(JSON, nullable=True)
    similarity_scores = Column(JSON, nullable=True)

    retrieval_latency_ms = Column(Float, nullable=False, default=0.0)
    generation_latency_ms = Column(Float, nullable=False, default=0.0)
    total_latency_ms = Column(Float, nullable=False, default=0.0)

    # Internal DB-only debug field (excluded from API responses)
    raw_output_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    requirement = relationship("Requirement", backref="reviews")
    requirement_version = relationship("RequirementVersion", backref="reviews")
    project = relationship(
        "Project",
        backref=backref("requirement_reviews", cascade="all, delete-orphan", passive_deletes=True),
        passive_deletes=True,
    )
    company = relationship("Company", backref="requirement_reviews")
    ai_job = relationship("AIJob", foreign_keys=[ai_job_id])

    findings = relationship(
        "RequirementReviewFinding",
        back_populates="review",
        cascade="all, delete-orphan",
    )


class RequirementReviewFinding(Base):
    __tablename__ = "requirement_review_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    review_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirement_reviews.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    severity = Column(Enum(ReviewSeverity), nullable=False, index=True)
    issue_type = Column(Enum(ReviewIssueType), nullable=False, index=True)
    evidence_status = Column(
        Enum(FindingEvidenceStatus),
        nullable=False,
        default=FindingEvidenceStatus.GROUNDED,
        index=True,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    source_references = Column(JSON, nullable=False, default=list)  # Verified source keys

    human_decision = Column(
        Enum(FindingHumanDecision),
        nullable=False,
        default=FindingHumanDecision.PENDING,
        index=True,
    )
    human_comment = Column(Text, nullable=True)
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

    review = relationship("RequirementReview", back_populates="findings")
    updater = relationship("User", foreign_keys=[updated_by])
