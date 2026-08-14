from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import (
    EvaluationCondition,
    EvaluationCaseType,
    RequirementType,
    AIJobStatus,
)


class CreateEvaluationDatasetRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    version: str = Field("1.0", min_length=1, max_length=50)


class EvaluationDatasetResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    version: str
    created_by: Optional[UUID] = None
    created_at: datetime
    case_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CreateEvaluationCaseRequest(BaseModel):
    case_type: EvaluationCaseType = EvaluationCaseType.CONTEXT_RICH
    requirement_text: str = Field(..., min_length=1)
    requirement_type: RequirementType = RequirementType.FUNCTIONAL
    project_context: Optional[str] = Field(None, description="Simulated project artifacts for RAG evaluation")
    expected_issue_types: list[str] = Field(default_factory=list, description="Ground truth issue types")
    expected_severities: list[str] = Field(default_factory=list, description="Ground truth severities")
    expected_sources: list[str] = Field(default_factory=list, description="Ground truth source keys")
    has_issue: bool = Field(True, description="False for clean requirements")
    ground_truth_notes: Optional[str] = Field(None, description="Human verification notes")


class EvaluationCaseResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    case_type: EvaluationCaseType
    requirement_text: str
    requirement_type: RequirementType
    project_context: Optional[str] = None
    expected_issue_types: list[str]
    expected_severities: list[str]
    expected_sources: list[str]
    has_issue: bool
    ground_truth_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreateEvaluationRunRequest(BaseModel):
    dataset_id: UUID
    condition: EvaluationCondition = EvaluationCondition.RAG_LLM
    model_name: str = Field("mock-deterministic-v1", max_length=100)
    prompt_version: str = Field("REQUIREMENT_REVIEW_PROMPT_V1", max_length=100)
    embedding_model: Optional[str] = Field(None, description="Strictly NULL for LLM_ONLY")
    retrieval_top_k: int = Field(5, ge=1, le=50)
    chunk_configuration: dict = Field(default_factory=lambda: {"chunk_size": 512, "chunk_overlap": 64})


class EvaluationCaseResultResponse(BaseModel):
    id: UUID
    evaluation_run_id: UUID
    case_id: UUID
    review_id: Optional[UUID] = None
    predicted_findings: list[Any]
    predicted_issue_types: list[str]
    predicted_severities: list[str]
    grounded_count: int
    insufficient_context_count: int
    retrieved_chunk_ids: Optional[list[str]] = None
    retrieval_scores: Optional[list[float]] = None
    latency_ms: float
    tp: int
    fp: int
    fn: int
    tn: int
    retrieval_precision_at_k: float
    retrieval_recall_at_k: float
    mrr: float

    model_config = ConfigDict(from_attributes=True)


class EvaluationRunResponse(BaseModel):
    id: UUID
    dataset_id: UUID
    condition: EvaluationCondition
    model_name: str
    prompt_version: str
    embedding_model: Optional[str] = None
    retrieval_top_k: int
    chunk_configuration: dict
    status: AIJobStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    configuration_metadata: Optional[dict] = None
    aggregate_precision: float
    aggregate_recall: float
    aggregate_f1: float
    aggregate_precision_at_k: float
    aggregate_recall_at_k: float
    aggregate_mrr: float
    aggregate_grounding_rate: float
    aggregate_insufficient_context_rate: float
    aggregate_human_acceptance_rate: float
    aggregate_human_rejection_rate: float
    aggregate_human_modification_rate: float
    avg_retrieval_latency_ms: float
    avg_generation_latency_ms: float
    avg_total_latency_ms: float
    metrics_by_requirement_type: Optional[dict] = None
    metrics_by_context_type: Optional[dict] = None
    case_results: list[EvaluationCaseResultResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
