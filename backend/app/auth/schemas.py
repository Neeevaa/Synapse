import re
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from app.models.enums import SubscriptionPlan

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"


class UserRegisterRequest(BaseModel):
    company_name: str = Field(
        ..., min_length=1, max_length=150, description="Name of the company to create"
    )
    first_name: str = Field(
        ..., min_length=1, max_length=100, description="Owner's first name"
    )
    last_name: str = Field(
        ..., min_length=1, max_length=100, description="Owner's last name"
    )
    email: str = Field(
        ..., min_length=3, max_length=255, description="Owner's email address"
    )
    password: str = Field(
        ..., min_length=8, max_length=100, description="Owner's password (min 8 chars)"
    )
    designation: str | None = Field(
        None, max_length=100, description="Owner's professional designation"
    )
    subscription_plan: SubscriptionPlan = Field(
        default=SubscriptionPlan.FREE, description="Company subscription plan selection"
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email address format")
        return v_stripped


class TeamMemberRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=100)
    invitation_token: str | None = Field(default=None, description="Optional raw invitation token")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email address format")
        return v_stripped


class UserRegisterResponseData(BaseModel):
    user_id: UUID
    company_id: UUID
    verification_token: str


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email address format")
        return v_stripped


class LoginResponseData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = Field(default="bearer")
    role: str | None = Field(default=None, description="CompanyRole: OWNER, ADMIN, or None")
    company_role: str | None = Field(default=None, description="CompanyRole: OWNER, ADMIN, or None")
    is_super_admin: bool = Field(default=False, description="Whether user is a platform Super Admin")
    project_roles: list[str] = Field(default_factory=list, description="List of ProjectRole values assigned to user")


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=1)


class VerifyEmailResponseData(BaseModel):
    user_id: UUID
    email: str
    is_verified: bool = Field(default=True)


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class TokenRefreshResponseData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = Field(default="bearer")


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v_stripped = v.strip().lower()
        if not re.match(EMAIL_REGEX, v_stripped):
            raise ValueError("Invalid email address format")
        return v_stripped


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)


class ProjectMembershipInfo(BaseModel):
    project_id: UUID
    project_name: str
    project_description: str | None = None
    project_role: str


class UserProfileResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str
    company_id: UUID | None = None
    company_name: str | None = None
    role: str | None = Field(default=None, description="Role of user in company")
    company_role: str | None = Field(default=None, description="Role of user in company")
    is_super_admin: bool = Field(default=False, description="Whether user is a platform Super Admin")
    designation: str | None = Field(None)
    avatar_url: str | None = Field(None)
    bio: str | None = Field(None)
    profile_completed: bool
    is_active: bool
    is_verified: bool
    project_memberships: list[ProjectMembershipInfo] = Field(default_factory=list)


class UpdateProfileRequest(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    designation: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=500)
    avatar_url: str | None = Field(None)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=1, description="Google OAuth ID token")
    is_join: bool = Field(default=False, description="Whether request originates from the join flow")
    invitation_token: str | None = Field(default=None, description="Optional raw invitation token")
