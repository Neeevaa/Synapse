from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=250, description="Task title")
    description: str | None = Field(None, max_length=2000)
    status: str = Field(default="TODO", description="TaskStatus Enum: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED")
    priority: str = Field(default="MEDIUM", description="TaskPriority Enum: LOW, MEDIUM, HIGH, URGENT")
    sprint_id: UUID | None = None
    assignee_id: UUID | None = None


class UpdateTaskRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=250)
    description: str | None = Field(None, max_length=2000)
    status: str | None = None
    priority: str | None = None
    assignee_id: UUID | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(..., description="TaskStatus Enum: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED")


class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: UUID | None = None
    title: str
    description: str | None = None
    status: str
    priority: str
    assignee_id: UUID | None = None
    assignee_name: str | None = None
    created_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
