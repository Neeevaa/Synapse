from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import (
    RequirementType,
    RequirementStatus,
    RequirementPriority,
    RequirementSource,
)


class RequirementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Requirement title")
    description: str = Field(..., min_length=1, description="Requirement detailed description")
    requirement_type: RequirementType = Field(default=RequirementType.FUNCTIONAL)
    priority: RequirementPriority = Field(default=RequirementPriority.MEDIUM)
    source: RequirementSource = Field(default=RequirementSource.MANUAL_ENTRY)
    acceptance_criteria: Optional[str] = Field(default=None, description="Structured acceptance criteria")


class RequirementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    requirement_type: Optional[RequirementType] = None
    priority: Optional[RequirementPriority] = None
    source: Optional[RequirementSource] = None
    acceptance_criteria: Optional[str] = None
    change_summary: Optional[str] = Field(None, max_length=500, description="Reason / summary of changes in this version")


class RequirementStatusUpdate(BaseModel):
    status: RequirementStatus = Field(..., description="Target status transition")
    change_summary: Optional[str] = Field(None, max_length=500)


class RequirementVersionResponse(BaseModel):
    id: UUID
    requirement_id: UUID
    version_number: int
    title: str
    description: str
    acceptance_criteria: Optional[str] = None
    requirement_type: RequirementType
    priority: RequirementPriority
    status: RequirementStatus
    source: RequirementSource
    change_summary: Optional[str] = None
    created_by: UUID
    author_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RequirementResponse(BaseModel):
    id: UUID
    project_id: UUID
    company_id: UUID
    requirement_key: str
    title: str
    description: str
    requirement_type: RequirementType
    priority: RequirementPriority
    status: RequirementStatus
    source: RequirementSource
    acceptance_criteria: Optional[str] = None
    current_version: int
    created_by: UUID
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    versions: list[RequirementVersionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RequirementListResponse(BaseModel):
    requirements: list[RequirementResponse]
    total: int
    page: int
    page_size: int
