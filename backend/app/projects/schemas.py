import re
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from datetime import datetime


class CreateProjectRequest(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=200, description="Project name"
    )
    description: str | None = Field(
        None, max_length=2000, description="Project description"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Project name cannot be empty or only spaces.")
        if not re.search(r"[a-zA-Z0-9]", v_stripped):
            raise ValueError("Project name must contain letters or numbers, not only symbols.")
        return v_stripped


class UpdateProjectRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    status: str | None = Field(None)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Project name cannot be empty or only spaces.")
            if not re.search(r"[a-zA-Z0-9]", v_stripped):
                raise ValueError("Project name must contain letters or numbers, not only symbols.")
            return v_stripped
        return v


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    status: str
    created_by: UUID | None = None
    creator_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetailResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    status: str
    created_by: UUID | None = None
    creator_name: str | None = None
    created_at: datetime
    sprint_count: int = 0
    task_count: int = 0
    member_count: int = 0

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
