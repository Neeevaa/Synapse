from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    company_id: UUID | None = None
    action: str
    description: str
    details: str | None = None
    created_at: datetime


class PaginatedActivityResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    page: int
    pages: int
