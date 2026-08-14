from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import (
    MeetingType,
    MeetingStatus,
    AttendanceStatus,
    ActionItemStatus,
    ActionItemPriority,
)


class MeetingParticipantCreate(BaseModel):
    user_id: UUID
    attendance_status: AttendanceStatus = Field(default=AttendanceStatus.INVITED)


class MeetingParticipantResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    attendance_status: AttendanceStatus
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MeetingAgendaItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int = Field(default=0)
    status: str = Field(default="PLANNED")


class MeetingAgendaItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: Optional[int] = None
    status: Optional[str] = None


class MeetingAgendaItemResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    title: str
    description: Optional[str] = None
    order_index: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class MeetingActionItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    assigned_to: Optional[UUID] = None
    due_date: Optional[datetime] = None
    priority: ActionItemPriority = Field(default=ActionItemPriority.MEDIUM)
    requirement_id: Optional[UUID] = None
    task_id: Optional[UUID] = None


class MeetingActionItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    assigned_to: Optional[UUID] = None
    due_date: Optional[datetime] = None
    status: Optional[ActionItemStatus] = None
    priority: Optional[ActionItemPriority] = None
    requirement_id: Optional[UUID] = None
    task_id: Optional[UUID] = None


class MeetingActionItemResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    title: str
    description: Optional[str] = None
    assigned_to: Optional[UUID] = None
    assignee_name: Optional[str] = None
    due_date: Optional[datetime] = None
    status: ActionItemStatus
    priority: ActionItemPriority
    requirement_id: Optional[UUID] = None
    requirement_key: Optional[str] = None
    task_id: Optional[UUID] = None
    task_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranscriptUpdate(BaseModel):
    transcript: str = Field(..., description="Raw meeting transcript text")
    recording_url_or_reference: Optional[str] = Field(None, max_length=500)


class MeetingNotesUpdate(BaseModel):
    summary: Optional[str] = None
    decisions: Optional[str] = None
    discussion_notes: Optional[str] = None
    risks_concerns: Optional[str] = None


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_type: MeetingType = Field(default=MeetingType.PLANNING)
    organizer_id: Optional[UUID] = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=5, le=1440)
    participant_ids: list[UUID] = Field(default_factory=list)
    agenda_items: list[MeetingAgendaItemCreate] = Field(default_factory=list)


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_type: Optional[MeetingType] = None
    organizer_id: Optional[UUID] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=5, le=1440)
    status: Optional[MeetingStatus] = None
    summary: Optional[str] = None
    decisions: Optional[str] = None
    discussion_notes: Optional[str] = None
    risks_concerns: Optional[str] = None


class MeetingResponse(BaseModel):
    id: UUID
    project_id: UUID
    company_id: UUID
    title: str
    description: Optional[str] = None
    meeting_type: MeetingType
    organizer_id: UUID
    organizer_name: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    status: MeetingStatus
    summary: Optional[str] = None
    decisions: Optional[str] = None
    discussion_notes: Optional[str] = None
    risks_concerns: Optional[str] = None
    transcript: Optional[str] = None
    transcript_updated_at: Optional[datetime] = None
    recording_url_or_reference: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    participants: list[MeetingParticipantResponse] = Field(default_factory=list)
    agenda_items: list[MeetingAgendaItemResponse] = Field(default_factory=list)
    action_items: list[MeetingActionItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MeetingListResponse(BaseModel):
    meetings: list[MeetingResponse]
    total: int
    page: int
    page_size: int
