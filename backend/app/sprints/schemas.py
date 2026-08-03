from pydantic import BaseModel, Field, field_validator, model_validator
from uuid import UUID
from datetime import datetime


class CreateSprintRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Sprint name")
    goal: str | None = Field(None, max_length=1000, description="Sprint goal")
    start_date: datetime | None = None
    end_date: datetime | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Sprint name cannot be empty or blank.")
        return v_stripped

    @model_validator(mode="after")
    def validate_dates(self) -> "CreateSprintRequest":
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                raise ValueError("Sprint end_date must be strictly after start_date.")
        return self


class UpdateSprintRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    goal: str | None = Field(None, max_length=1000)
    status: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Sprint name cannot be empty or blank.")
            return v_stripped
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "UpdateSprintRequest":
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                raise ValueError("Sprint end_date must be strictly after start_date.")
        return self


class SprintResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    goal: str | None = None
    status: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    total_tasks: int = 0
    completed_tasks: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class SprintListResponse(BaseModel):
    sprints: list[SprintResponse]
    total: int
