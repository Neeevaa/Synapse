from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, ForeignKey, DateTime, Enum, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.enums import (
    EvaluationCondition,
    EvaluationCaseType,
    RequirementType,
    AIJobStatus,
)


class EvaluationDataset(Base):
    __tablename__ = "evaluation_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String(50), nullable=False, default="1.0")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    cases = relationship("EvaluationCase", back_populates="dataset", cascade="all, delete-orphan")
    runs = relationship("EvaluationRun", back_populates="dataset", cascade="all, delete-orphan")


class EvaluationCase(Base):
    __tablename__ = "evaluation_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    case_type = Column(Enum(EvaluationCaseType), nullable=False, default=EvaluationCaseType.CONTEXT_RICH, index=True)
    requirement_text = Column(Text, nullable=False)
    requirement_type = Column(Enum(RequirementType), nullable=False, default=RequirementType.FUNCTIONAL, index=True)
    project_context = Column(Text, nullable=True)  # Simulated project context (meetings, tasks, etc.)
    expected_issue_types = Column(JSON, nullable=False, default=list)  # Ground truth human issue labels
    expected_severities = Column(JSON, nullable=False, default=list)
    expected_sources = Column(JSON, nullable=False, default=list)  # Ground truth source key references
    has_issue = Column(Boolean, nullable=False, default=True)  # Supports clean requirements
    ground_truth_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    dataset = relationship("EvaluationDataset", back_populates="cases")
    case_results = relationship("EvaluationCaseResult", back_populates="case", cascade="all, delete-orphan")


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    condition = Column(Enum(EvaluationCondition), nullable=False, default=EvaluationCondition.RAG_LLM, index=True)
    model_name = Column(String(100), nullable=False, default="mock-deterministic-v1")
    prompt_version = Column(String(100), nullable=False, default="REQUIREMENT_REVIEW_PROMPT_V1")
    embedding_model = Column(String(100), nullable=True)  # Strictly NULL for LLM_ONLY
    retrieval_top_k = Column(Integer, nullable=False, default=5)
    chunk_configuration = Column(JSON, nullable=False, default=lambda: {"chunk_size": 512, "chunk_overlap": 64})
    status = Column(Enum(AIJobStatus, name="aijobstatus"), nullable=False, default=AIJobStatus.QUEUED, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    configuration_metadata = Column(JSON, nullable=True)

    # Authoritative Backend-Persisted Aggregate Metrics
    aggregate_precision = Column(Float, nullable=False, default=0.0)
    aggregate_recall = Column(Float, nullable=False, default=0.0)
    aggregate_f1 = Column(Float, nullable=False, default=0.0)
    aggregate_precision_at_k = Column(Float, nullable=False, default=0.0)
    aggregate_recall_at_k = Column(Float, nullable=False, default=0.0)
    aggregate_mrr = Column(Float, nullable=False, default=0.0)
    aggregate_grounding_rate = Column(Float, nullable=False, default=0.0)
    aggregate_insufficient_context_rate = Column(Float, nullable=False, default=0.0)
    aggregate_human_acceptance_rate = Column(Float, nullable=False, default=0.0)
    aggregate_human_rejection_rate = Column(Float, nullable=False, default=0.0)
    aggregate_human_modification_rate = Column(Float, nullable=False, default=0.0)
    avg_retrieval_latency_ms = Column(Float, nullable=False, default=0.0)
    avg_generation_latency_ms = Column(Float, nullable=False, default=0.0)
    avg_total_latency_ms = Column(Float, nullable=False, default=0.0)

    # Subgroup Metrics Breakdown (Persisted JSON telemetry)
    metrics_by_requirement_type = Column(JSON, nullable=True)
    metrics_by_context_type = Column(JSON, nullable=True)

    dataset = relationship("EvaluationDataset", back_populates="runs")
    case_results = relationship("EvaluationCaseResult", back_populates="evaluation_run", cascade="all, delete-orphan")


class EvaluationCaseResult(Base):
    __tablename__ = "evaluation_case_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    evaluation_run_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    review_id = Column(UUID(as_uuid=True), ForeignKey("requirement_reviews.id", ondelete="SET NULL"), nullable=True)
    predicted_findings = Column(JSON, nullable=False, default=list)
    predicted_issue_types = Column(JSON, nullable=False, default=list)
    predicted_severities = Column(JSON, nullable=False, default=list)
    grounded_count = Column(Integer, nullable=False, default=0)
    insufficient_context_count = Column(Integer, nullable=False, default=0)
    retrieved_chunk_ids = Column(JSON, nullable=True)
    retrieval_scores = Column(JSON, nullable=True)
    latency_ms = Column(Float, nullable=False, default=0.0)
    tp = Column(Integer, nullable=False, default=0)
    fp = Column(Integer, nullable=False, default=0)
    fn = Column(Integer, nullable=False, default=0)
    tn = Column(Integer, nullable=False, default=0)  # Retained for schema completeness
    retrieval_precision_at_k = Column(Float, nullable=False, default=0.0)
    retrieval_recall_at_k = Column(Float, nullable=False, default=0.0)
    mrr = Column(Float, nullable=False, default=0.0)

    evaluation_run = relationship("EvaluationRun", back_populates="case_results")
    case = relationship("EvaluationCase", back_populates="case_results")
    review = relationship("RequirementReview", foreign_keys=[review_id])
