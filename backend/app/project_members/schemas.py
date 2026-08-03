import re
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from datetime import datetime
from app.models.enums import ProjectRole

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"


class AddProjectMemberRequest(BaseModel):
    email: str = Field(..., description="Email address of user to add to project")
    role: ProjectRole = Field(default=ProjectRole.DEVELOPER, description="ProjectRole Enum value")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email format.")
        return v_stripped


class ProjectMemberResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID | None = None
    first_name: str
    last_name: str
    email: str
    role: str
    outcome: str = Field(default="added", description="Outcomes: 'added' or 'pending'")
    is_pending: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectMemberListResponse(BaseModel):
    members: list[ProjectMemberResponse]
    total: int
