from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import (
    RequirementReviewStatus,
    ReviewIssueType,
    ReviewSeverity,
    FindingEvidenceStatus,
    FindingHumanDecision,
)


class FindingOutputItem(BaseModel):
    severity: ReviewSeverity
    issue_type: ReviewIssueType
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    evidence: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    source_references: list[str] = Field(default_factory=list)


class ReviewOutputSchema(BaseModel):
    findings: list[FindingOutputItem] = Field(default_factory=list)


class FindingResponse(BaseModel):
    id: UUID
    review_id: UUID
    severity: ReviewSeverity
    issue_type: ReviewIssueType
    evidence_status: FindingEvidenceStatus
    title: str
    description: str
    evidence: str
    recommendation: str
    source_references: list[str]
    human_decision: FindingHumanDecision
    human_comment: Optional[str] = None
    updated_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RequirementReviewResponse(BaseModel):
    id: UUID
    requirement_id: UUID
    requirement_version_id: UUID
    project_id: UUID
    company_id: UUID
    ai_job_id: Optional[UUID] = None
    status: RequirementReviewStatus
    model_name: str
    prompt_version: str
    retrieval_top_k: int
    retrieved_chunk_ids: Optional[list[str]] = None
    similarity_scores: Optional[list[float]] = None
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    findings: list[FindingResponse] = Field(default_factory=list)

    # raw_output_json is STRICTLY EXCLUDED from user-facing responses
    model_config = ConfigDict(from_attributes=True)


class UpdateFindingDecisionRequest(BaseModel):
    human_decision: FindingHumanDecision
    human_comment: Optional[str] = Field(None, description="Optional feedback comment")
    modified_recommendation: Optional[str] = Field(None, description="Edited recommendation when decision is MODIFIED")
