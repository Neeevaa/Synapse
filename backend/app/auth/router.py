from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.schemas import (
    UserRegisterRequest,
    TeamMemberRegisterRequest,
    UserRegisterResponseData,
    LoginRequest,
    LoginResponseData,
    VerifyEmailRequest,
    VerifyEmailResponseData,
    TokenRefreshRequest,
    TokenRefreshResponseData,
    LogoutRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserProfileResponse,
    GoogleAuthRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
)
from app.auth.service import AuthService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user, require_owner
from app.models.user import User

router = APIRouter()


@router.post(
    "/register",
    response_model=APIResponse[UserRegisterResponseData],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new company and owner user",
    description="Accepts company and user registration details. Validates uniqueness, hashes credentials, creates company and OWNER user, and outputs an email verification token.",
)
def register(
    data: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    result = service.register_owner(data)
    return success_response(
        message="User registered successfully. Verification email generated.",
        data=result,
    )


@router.post(
    "/register/member",
    response_model=APIResponse[UserRegisterResponseData],
    status_code=status.HTTP_201_CREATED,
    summary="Register an invited team member",
    description="Registers an invited user via email, matching their pending invitations and linking them to projects.",
)
def register_member(
    data: TeamMemberRegisterRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    result = service.register_team_member(data)
    return success_response(
        message="Team member registered successfully.",
        data=result,
    )



@router.post(
    "/login",
    response_model=APIResponse[LoginResponseData],
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user and return tokens",
    description="Authenticates credentials, asserts email verification status, and issues access and refresh tokens.",
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    result = service.login_user(data)
    return success_response(
        message="Login successful.",
        data=result,
    )


@router.post(
    "/google",
    response_model=APIResponse[LoginResponseData],
    status_code=status.HTTP_200_OK,
    summary="Authenticate or register user via Google Sign-In",
    description="Accepts a Google ID token, verifies it server-side, and logs in or creates/links the user account.",
)
def google_auth(
    data: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    result = service.authenticate_google(data)
    return success_response(
        message="Google authentication successful.",
        data=result,
    )


@router.post(
    "/verify-email",
    response_model=APIResponse[VerifyEmailResponseData],
    status_code=status.HTTP_200_OK,
    summary="Verify user email address using token",
    description="Validates a token, marks user account verified, invalidates token, and yields status information.",
)
def verify_email(
    data: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    result = service.verify_email(data)
    return success_response(
        message="Email verified successfully.",
        data=result,
    )


@router.post(
    "/refresh",
    response_model=APIResponse[TokenRefreshResponseData],
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue new access token",
    description="Accepts a refresh token, validates state/expiry, revokes old token, and yields rotated new credentials.",
)
def refresh(
    data: TokenRefreshRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    result = service.refresh_tokens(data)
    return success_response(
        message="Token refreshed successfully.",
        data=result,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user by revoking refresh token",
    description="Revokes the provided refresh token so it cannot be used to obtain new access tokens.",
)
def logout(
    data: LogoutRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.logout_user(data)
    return success_response(message="Logout successful.")


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link",
    description="Saves a reset token and sends a reset link to the email. Returns success regardless of account existence.",
)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.forgot_password(data)
    return success_response(
        message="If the email exists, a password reset link has been sent."
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using verification token",
    description="Accepts reset token and updates the password.",
)
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.reset_password(data)
    return success_response(message="Password reset successful.")


@router.get(
    "/me",
    response_model=APIResponse[UserProfileResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns the profile details of the currently logged-in user, including company and project memberships.",
)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return success_response(
        message="Profile retrieved successfully.",
        data=service.get_user_profile_response(current_user),
    )


@router.patch(
    "/profile",
    response_model=APIResponse[UserProfileResponse],
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
    description="Updates user profile fields for the authenticated user and sets profile_completed to True once required fields (designation and bio) are filled.",
)
def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    updated_user = service.update_user_profile(current_user, data)
    return success_response(
        message="Profile updated successfully.",
        data=service.get_user_profile_response(updated_user),
    )


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change user password",
    description="Verifies the old password and updates to a new bcrypt hashed password for the logged-in user.",
)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.change_password(current_user, data)
    return success_response(message="Password changed successfully.")


@router.get(
    "/test-owner-only",
    response_model=APIResponse[str],
    status_code=status.HTTP_200_OK,
    summary="Role-restricted test endpoint",
    description="Requires OWNER role to verify route permission restriction checks.",
)
def test_owner_only(
    current_user: User = Depends(require_owner()),
):
    return success_response(
        message="Access granted.",
        data="Welcome, Owner!",
    )
