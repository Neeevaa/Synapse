from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ConversationType


class MessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Message text content")

    @field_validator("content")
    @classmethod
    def validate_not_whitespace(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Message content cannot be empty or whitespace only.")
        return clean


class SenderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    email: str
    avatar_url: str | None = None
    role: str | None = None
    designation: str | None = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender: SenderResponse
    content: str
    created_at: datetime
    updated_at: datetime


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total: int
    limit: int
    offset: int


class ConversationMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    user: SenderResponse
    joined_at: datetime
    last_read_at: datetime | None = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    conversation_type: ConversationType
    name: str | None = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    members: list[ConversationMemberResponse] = Field(default_factory=list)
    last_message: MessageResponse | None = None
    unread_count: int = 0


class DirectConversationCreateRequest(BaseModel):
    recipient_id: UUID


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    email: str
    avatar_url: str | None = None
    project_role: str | None = None
    company_role: str | None = None
    designation: str | None = None
    is_cto: bool = False
