from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class CreateAIJobRequest(BaseModel):
    project_id: UUID | None = Field(None, description="Optional project context")
    type: str = Field(..., min_length=1, max_length=100, description="Job type (REQUIREMENT_REVIEW, MEETING_ANALYSIS, TEST_GEN, etc.)")
    result_metadata: dict | None = Field(None, description="Initial parameters or metadata")


class AIJobResponse(BaseModel):
    id: UUID
    project_id: UUID | None = None
    type: str
    status: str
    created_by: UUID
    error_message: str | None = None
    result_metadata: dict | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AIJobListResponse(BaseModel):
    jobs: list[AIJobResponse]
    total: int
