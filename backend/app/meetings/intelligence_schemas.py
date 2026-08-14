from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import (
    RequirementReviewStatus,
    TaskWorkstream,
    TaskPriority,
    FindingHumanDecision,
    ActionItemPriority,
)


class ActionItemOutputItem(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    assigned_to_email_or_name: Optional[str] = None
    due_date_str: Optional[str] = None
    priority: ActionItemPriority = ActionItemPriority.MEDIUM
    requirement_key: Optional[str] = None


class TaskSuggestionOutputItem(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    workstream: TaskWorkstream = TaskWorkstream.GENERAL
    priority: TaskPriority = TaskPriority.MEDIUM
    story_points: int = Field(default=1, ge=1, le=13)
    requirement_key: Optional[str] = None


class MeetingAnalysisOutputSchema(BaseModel):
    summary: str = Field(..., min_length=1)
    decisions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    action_items: list[ActionItemOutputItem] = Field(default_factory=list)
    task_suggestions: list[TaskSuggestionOutputItem] = Field(default_factory=list)


class MeetingTaskSuggestionResponse(BaseModel):
    id: UUID
    analysis_id: UUID
    meeting_id: UUID
    project_id: UUID
    company_id: UUID
    title: str
    description: str
    workstream: TaskWorkstream
    priority: TaskPriority
    story_points: Optional[int] = 1
    requirement_id: Optional[UUID] = None
    human_decision: FindingHumanDecision
    human_comment: Optional[str] = None
    created_task_id: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeetingAnalysisResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    project_id: UUID
    company_id: UUID
    ai_job_id: Optional[UUID] = None
    status: RequirementReviewStatus
    model_name: str
    prompt_version: str
    summary: Optional[str] = None
    decisions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    retrieved_chunk_ids: Optional[list[str]] = None
    similarity_scores: Optional[list[float]] = None
    retrieval_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    task_suggestions: list[MeetingTaskSuggestionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UpdateTaskSuggestionDecisionRequest(BaseModel):
    human_decision: FindingHumanDecision
    human_comment: Optional[str] = Field(None, description="Optional reviewer feedback comment")
    edited_title: Optional[str] = Field(None, description="Custom title if edited")
    edited_description: Optional[str] = Field(None, description="Custom description if edited")
    edited_workstream: Optional[TaskWorkstream] = None
    edited_priority: Optional[TaskPriority] = None
    edited_story_points: Optional[int] = Field(None, ge=1, le=13)


class MeetingIntelligenceMetricsResponse(BaseModel):
    project_id: UUID
    total_analyses_run: int
    total_suggestions_generated: int
    accepted_suggestions_count: int
    modified_suggestions_count: int
    rejected_suggestions_count: int
    human_acceptance_rate: float  # Percentage e.g. 85.0%
    average_retrieval_latency_ms: float
    average_generation_latency_ms: float
    summary_quality_score: float
    action_item_precision: float
    task_creation_precision: float
