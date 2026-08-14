from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=250, description="Task title")
    description: str | None = Field(None, max_length=2000)
    status: str = Field(default="TODO", description="TaskStatus Enum: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED")
    priority: str = Field(default="MEDIUM", description="TaskPriority Enum: LOW, MEDIUM, HIGH, URGENT")
    workstream: str | None = Field(default="GENERAL", description="TaskWorkstream Enum: UI_UX, FRONTEND, BACKEND, QA, DEVOPS, AI_ML, GENERAL")
    sprint_id: UUID | None = None
    assignee_id: UUID | None = None
    story_points: int | None = Field(None, ge=0, le=100, description="Estimated story points")
    position: int | None = Field(None, description="Order position in backlog")


class UpdateTaskRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=250)
    description: str | None = Field(None, max_length=2000)
    status: str | None = None
    priority: str | None = None
    workstream: str | None = None
    sprint_id: UUID | None = None
    clear_sprint: bool = Field(default=False, description="Set to true to unassign task from sprint and move to backlog")
    assignee_id: UUID | None = None
    story_points: int | None = Field(None, ge=0, le=100)
    position: int | None = None


class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(..., description="TaskStatus Enum: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED")


class ReorderBacklogRequest(BaseModel):
    task_ids: list[UUID] = Field(..., description="Ordered list of task IDs for the backlog")


class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    sprint_id: UUID | None = None
    title: str
    description: str | None = None
    status: str
    priority: str
    workstream: str | None = None
    story_points: int | None = None
    position: int = 0
    assignee_id: UUID | None = None
    assignee_name: str | None = None
    created_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
