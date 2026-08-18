import re
from pydantic import BaseModel, Field, field_validator, model_validator
from uuid import UUID
from datetime import datetime
from app.models.enums import ProjectRole, Specialization

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"


class AddProjectMemberRequest(BaseModel):
    email: str = Field(..., description="Email address of user to add to project")
    role: ProjectRole = Field(default=ProjectRole.DEVELOPER, description="ProjectRole Enum value")
    specialization: Specialization | None = Field(default=None, description="Optional technical specialization")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email format.")
        return v_stripped

    @model_validator(mode="after")
    def validate_role_specialization(self) -> "AddProjectMemberRequest":
        # Rule: If role == DEVELOPER and specialization is omitted/null, default to OTHER.
        # Note: PROJECT_MANAGER, TEAM_LEAD, and VIEWER allow an optional specialization if specified,
        # but do not force a default value when omitted.
        if self.role == ProjectRole.DEVELOPER and self.specialization is None:
            self.specialization = Specialization.OTHER
        return self


class ProjectMemberResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID | None = None
    first_name: str
    last_name: str
    email: str
    role: str
    specialization: str | None = None
    outcome: str = Field(default="added", description="Outcomes: 'added' or 'pending'")
    is_pending: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteProjectMemberRequest(BaseModel):
    email: str = Field(..., description="Email address of user to invite")
    project_role: ProjectRole = Field(default=ProjectRole.DEVELOPER, description="ProjectRole Enum value")
    specialization: Specialization | None = Field(default=None, description="Optional technical specialization")
    personal_message: str | None = Field(default=None, max_length=1000, description="Optional personal invitation message")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email format.")
        return v_stripped

    @model_validator(mode="after")
    def validate_role_specialization(self) -> "InviteProjectMemberRequest":
        if self.project_role == ProjectRole.DEVELOPER and self.specialization is None:
            self.specialization = Specialization.OTHER
        return self


class InvitationResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    email: str
    project_role: str
    specialization: str | None = None
    personal_message: str | None = None
    status: str
    expires_at: datetime
    created_by: UUID
    created_at: datetime
    join_url: str | None = None

    model_config = {"from_attributes": True}


class ValidateInvitationResponse(BaseModel):
    id: UUID
    company_id: UUID
    company_name: str
    project_id: UUID
    project_name: str
    email: str
    project_role: str
    specialization: str | None = None
    personal_message: str | None = None
    inviter_name: str
    status: str
    expires_at: datetime
    is_valid: bool


class AcceptInvitationRequest(BaseModel):
    token: str | None = Field(default=None, description="Raw invitation token string")
    invitation_id: UUID | None = Field(default=None, description="Optional invitation ID for authenticated user")


class UpdateProjectMemberRoleRequest(BaseModel):
    role: ProjectRole = Field(..., description="ProjectRole Enum value")
    specialization: Specialization | None = Field(default=None, description="Optional technical specialization")

    @model_validator(mode="after")
    def validate_role_specialization(self) -> "UpdateProjectMemberRoleRequest":
        if self.role == ProjectRole.DEVELOPER and self.specialization is None:
            self.specialization = Specialization.OTHER
        return self


class ProjectMemberListResponse(BaseModel):
    members: list[ProjectMemberResponse]
    total: int
