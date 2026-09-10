from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    recipient_user_id: UUID
    company_id: UUID
    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    type: NotificationType
    title: str
    message: str
    is_read: bool
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None
    deep_link: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None


class ProjectNotificationGroup(BaseModel):
    project_id: Optional[UUID] = None
    project_name: str
    unread_count: int
    notifications: list[NotificationResponse]


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    groups: list[ProjectNotificationGroup]
    unread_count: int
    total: int
    page: int
    pages: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkAllReadRequest(BaseModel):
    project_id: Optional[UUID] = None
