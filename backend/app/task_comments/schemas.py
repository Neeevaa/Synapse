from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class CreateTaskCommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Comment text content")


class TaskCommentResponse(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    author_name: str
    author_email: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCommentListResponse(BaseModel):
    comments: list[TaskCommentResponse]
    total: int
