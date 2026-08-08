import logging
import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.repository import AuthRepository
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
    GoogleAuthRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserProfileResponse,
    ProjectMembershipInfo,
)
from app.common.exceptions import (
    CompanyAlreadyExists,
    UserAlreadyExists,
    InvalidCredentials,
    UserNotVerified,
    ResourceNotFound,
    BaseBusinessException,
)
from app.common.helpers import slugify
from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.pending_membership import PendingMembership
from app.models.email_verification import EmailVerificationToken
from app.models.refresh_token import RefreshToken
from app.models.password_reset import PasswordResetToken
from app.models.enums import CompanyRole
from app.core.security import hash_password, verify_password
from app.core.security import hash_password, verify_password, create_access_token, hash_token
from app.events import event_bus

logger = logging.getLogger("app")


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AuthRepository(db)

    def register_owner(self, data: UserRegisterRequest) -> UserRegisterResponseData:
        """
        Registers a new company and its owner user.
        Generates an email verification token.
        Raises custom business exceptions (no FastAPI dependency).
        Publishes the 'user_registered' event to the internal event bus.
        """
        # 1. Validate Company Name uniqueness
        existing_company = self.repo.get_company_by_name(data.company_name)
        if existing_company:
            raise CompanyAlreadyExists("Company with this name already exists.")

        # 2. Slugify and check Company Slug uniqueness
        slug = slugify(data.company_name)
        existing_company_slug = self.repo.get_company_by_slug(slug)
        if existing_company_slug:
            raise CompanyAlreadyExists(
                "Company with a similar name/slug already exists."
            )

        # 3. Validate Email uniqueness
        existing_user = self.repo.get_user_by_email(data.email)
        if existing_user:
            raise UserAlreadyExists("Email already registered.")

        try:
            # 4. Hash Password
            hashed_pwd = hash_password(data.password)

            # 5. Create Company
            company = Company(
                name=data.company_name,
                slug=slug,
                subscription_plan=data.subscription_plan,
            )
            self.repo.create_company(company)

            # 6. Create Owner User
            user = User(
                company_id=company.id,
                first_name=data.first_name,
                last_name=data.last_name,
                email=data.email,
                password_hash=hashed_pwd,
                role=CompanyRole.OWNER,
                designation=data.designation,
                is_active=True,
                is_verified=True,
                profile_completed=False,
            )
            self.repo.create_user(user)

            # Commit the transaction
            self.db.commit()

            # Log success event in a structured format
            logger.info(
                "User registered successfully",
                extra={
                    "extra_info": {
                        "user_id": str(user.id),
                        "company_id": str(company.id),
                        "email": user.email,
                    }
                },
            )

            return UserRegisterResponseData(
                user_id=user.id,
                company_id=company.id,
                verification_token="",
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def login_user(self, data: LoginRequest) -> LoginResponseData:
        """
        Authenticates a user with email and password.
        Validates account verification state.
        Generates access (JWT) and hashed refresh tokens.
        Pushes events and structures logging for auditing.
        """
        user = self.repo.get_user_by_email(data.email)
        if not user:
            logger.warning(
                "Login failed: user not found",
                extra={"extra_info": {"email": data.email}},
            )
            raise InvalidCredentials("Invalid email or password.")

        if not user.password_hash or not verify_password(data.password, user.password_hash):
            logger.warning(
                "Login failed: incorrect password",
                extra={"extra_info": {"email": data.email, "user_id": str(user.id)}},
            )
            raise InvalidCredentials("Invalid email or password.")

        if not user.is_verified:
            logger.warning(
                "Login failed: user account not verified",
                extra={"extra_info": {"email": data.email, "user_id": str(user.id)}},
            )
            raise UserNotVerified("Account email verification is required.")

        try:
            # Generate stateful raw refresh token
            raw_refresh_token = secrets.token_urlsafe(64)
            hashed_refresh_token = hash_token(raw_refresh_token)

            # Create stateful RefreshToken using the hashed token in DB explicitly in UTC
            refresh_token_record = RefreshToken(
                user_id=user.id,
                token=hashed_refresh_token,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            )
            self.repo.create_refresh_token(refresh_token_record)

            # Generate stateless JWT AccessToken
            jwt_payload = {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
            }
            access_token = create_access_token(data=jwt_payload)

            self.db.commit()

            # Emit Login event
            event_bus.publish(
                "UserLoggedIn",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "company_id": user.company_id,
                },
            )

            # Log successful login
            logger.info(
                "Login successful",
                extra={
                    "extra_info": {
                        "user_id": str(user.id),
                        "company_id": str(user.company_id),
                        "email": user.email,
                    }
                },
            )

            # Query user's assigned project roles
            pm_roles = self.db.scalars(
                select(ProjectMember.role).filter(ProjectMember.user_id == user.id)
            ).all()
            project_roles_str = [r if isinstance(r, str) else r.value for r in pm_roles]
            company_role_str = user.role if isinstance(user.role, str) else user.role.value if user.role else None

            return LoginResponseData(
                access_token=access_token,
                refresh_token=raw_refresh_token,
                token_type="bearer",
                role=company_role_str or "MEMBER",
                company_role=company_role_str,
                project_roles=project_roles_str,
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def register_team_member(self, data: TeamMemberRegisterRequest) -> UserRegisterResponseData:
        """
        Registers an invited team member.
        Links their email to pending project invitations and creates real ProjectMember records.
        If invitations span multiple companies, picks the earliest invitation (by created_at).
        """
        email_clean = data.email.strip().lower()

        existing_user = self.repo.get_user_by_email(email_clean)
        if existing_user:
            raise UserAlreadyExists("Email already registered.")

        # Find pending invitations for this email, ordered by earliest invite first
        pendings = self.db.execute(
            select(PendingMembership)
            .filter(PendingMembership.email == email_clean)
            .order_by(PendingMembership.created_at.asc())
        ).scalars().all()

        if not pendings:
            raise BaseBusinessException(
                "No invitation found for this email address. Please request an invitation from your company administrator.",
                status_code=400,
            )

        # Get company ID from the earliest invited project
        first_project = pendings[0].project
        company_id = first_project.company_id

        try:
            hashed_pwd = hash_password(data.password)

            user = User(
                company_id=company_id,
                first_name=data.first_name,
                last_name=data.last_name,
                email=email_clean,
                password_hash=hashed_pwd,
                role=None,
                is_active=True,
                is_verified=True,
                profile_completed=True,
            )
            self.repo.create_user(user)
            self.db.flush()

            # Convert all pending invitations to ProjectMember records
            for p in pendings:
                member = ProjectMember(
                    project_id=p.project_id,
                    user_id=user.id,
                    role=p.role,
                )
                self.db.add(member)
                self.db.delete(p)

            self.db.commit()

            # Publish UserRegistered event to internal event bus
            event_bus.publish(
                "UserRegistered",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "company_id": company_id,
                },
            )

            logger.info(
                "Invited team member registered successfully",
                extra={
                    "extra_info": {
                        "user_id": str(user.id),
                        "company_id": str(company_id),
                        "email": user.email,
                    }
                },
            )

            return UserRegisterResponseData(
                user_id=user.id,
                company_id=company_id,
                verification_token="",
            )
        except Exception as e:
            self.db.rollback()
            raise e


    def verify_email(self, data: VerifyEmailRequest) -> VerifyEmailResponseData:
        """
        Validates email verification tokens.
        Marks user as verified, deletes the token, and publishes the UserVerified event.
        """
        token_record = self.repo.get_email_verification_token(data.token)
        if not token_record:
            raise InvalidCredentials("Verification token is invalid or expired.")

        # Check Token Expiry naively in UTC
        now = datetime.utcnow()
        token_expires = token_record.expires_at
        if token_expires.tzinfo is not None:
            token_expires = token_expires.astimezone(timezone.utc).replace(tzinfo=None)

        if now > token_expires:
            raise InvalidCredentials("Verification token is invalid or expired.")

        user = self.repo.get_user_by_id(token_record.user_id)
        if not user:
            raise ResourceNotFound("User associated with verification token not found.")

        try:
            # Update user verification state
            user.is_verified = True

            # Mark token used by deleting the verification token record
            self.repo.delete_email_verification_token(token_record)

            self.db.commit()

            # Publish UserVerified event
            event_bus.publish(
                "UserVerified",
                {
                    "user_id": user.id,
                    "email": user.email,
                },
            )

            # Log verification
            logger.info(
                "Email successfully verified",
                extra={"extra_info": {"user_id": str(user.id), "email": user.email}},
            )

            return VerifyEmailResponseData(
                user_id=user.id,
                email=user.email,
                is_verified=True,
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def refresh_tokens(self, data: TokenRefreshRequest) -> TokenRefreshResponseData:
        """
        Validates the incoming raw refresh token.
        Rotates the refresh token (revokes old, issues a new one hashed in DB).
        Returns a new access and refresh token pair.
        """
        hashed_token = hash_token(data.refresh_token)

        token_record = self.repo.get_refresh_token_by_token(hashed_token)
        if not token_record:
            logger.warning("Token refresh failed: token not found/invalid.")
            raise InvalidCredentials("Invalid or expired refresh token.")

        if token_record.revoked:
            logger.warning(
                "Token refresh failed: token already revoked/used.",
                extra={"extra_info": {"user_id": str(token_record.user_id)}},
            )
            raise InvalidCredentials("Refresh token has been revoked.")

        # Check Token Expiry naively in UTC
        now = datetime.utcnow()
        token_expires = token_record.expires_at
        if token_expires.tzinfo is None:
            pass
        else:
            token_expires = token_expires.astimezone(timezone.utc).replace(tzinfo=None)

        if now > token_expires:
            logger.warning(
                "Token refresh failed: token expired.",
                extra={"extra_info": {"user_id": str(token_record.user_id)}},
            )
            raise InvalidCredentials("Refresh token has expired.")

        user = self.repo.get_user_by_id(token_record.user_id)
        if not user:
            logger.warning("Token refresh failed: user not found.")
            raise ResourceNotFound("User associated with refresh token not found.")

        try:
            # 1. Revoke the old token
            token_record.revoked = True

            # 2. Generate a new refresh token explicitly in UTC
            new_raw_token = secrets.token_urlsafe(64)
            new_hashed_token = hash_token(new_raw_token)

            new_token_record = RefreshToken(
                user_id=user.id,
                token=new_hashed_token,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            )
            self.repo.create_refresh_token(new_token_record)

            # 3. Generate a new access token
            jwt_payload = {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
            }
            new_access_token = create_access_token(data=jwt_payload)

            self.db.commit()

            # Log successful refresh
            logger.info(
                "Token refresh successful",
                extra={
                    "extra_info": {
                        "user_id": str(user.id),
                        "email": user.email,
                    }
                },
            )

            return TokenRefreshResponseData(
                access_token=new_access_token,
                refresh_token=new_raw_token,
                token_type="bearer",
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def logout_user(self, data: LogoutRequest) -> None:
        """
        Invalidates a refresh token by setting its revoked field to True in DB.
        """
        hashed_token = hash_token(data.refresh_token)
        token_record = self.repo.get_refresh_token_by_token(hashed_token)
        if not token_record:
            logger.warning("Logout requested for invalid/missing refresh token.")
            raise InvalidCredentials("Invalid refresh token.")

        if token_record.revoked:
            logger.warning("Logout requested for already revoked refresh token.")
            raise InvalidCredentials("Refresh token has been revoked.")

        try:
            token_record.revoked = True
            self.db.commit()

            logger.info(
                "Logout successful",
                extra={
                    "extra_info": {
                        "user_id": str(token_record.user_id),
                    }
                },
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def forgot_password(self, data: ForgotPasswordRequest) -> None:
        """
        Generates a password reset token and publishes PasswordResetRequested.
        Succeeds silently (without raising) if email is not found to prevent user enumeration.
        """
        user = self.repo.get_user_by_email(data.email)
        if not user:
            logger.info(
                "Password reset requested for non-existent email address (ignored silently)",
                extra={"extra_info": {"email": data.email}},
            )
            return

        try:
            # Create a password reset token record explicitly in UTC
            token_record = PasswordResetToken(
                user_id=user.id,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
            )
            self.repo.create_password_reset_token(token_record)
            self.db.commit()

            # Publish the event to dispatch email asynchronously
            event_bus.publish(
                "PasswordResetRequested",
                {
                    "user_id": user.id,
                    "email": user.email,
                    "token": token_record.token,
                },
            )

            logger.info(
                "Password reset token generated and published",
                extra={
                    "extra_info": {
                        "user_id": str(user.id),
                        "email": user.email,
                    }
                },
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def reset_password(self, data: ResetPasswordRequest) -> None:
        """
        Accepts the reset token and new password.
        Asserts validity and updates the user record, consumes/deletes the token.
        """
        token_record = self.repo.get_password_reset_token(data.token)
        if not token_record:
            raise InvalidCredentials("Invalid or expired password reset token.")

        # Check Token Expiry naively in UTC
        now = datetime.utcnow()
        token_expires = token_record.expires_at
        if token_expires.tzinfo is not None:
            token_expires = token_expires.astimezone(timezone.utc).replace(tzinfo=None)

        if now > token_expires:
            try:
                self.repo.delete_password_reset_token(token_record)
                self.db.commit()
            except Exception:
                self.db.rollback()
            raise InvalidCredentials("Invalid or expired password reset token.")

        user = self.repo.get_user_by_id(token_record.user_id)
        if not user:
            raise ResourceNotFound("User associated with password reset token not found.")

        try:
            # Hash and set new password
            user.password_hash = hash_password(data.new_password)

            # Mark token used by deleting the token record
            self.repo.delete_password_reset_token(token_record)

            self.db.commit()

            # Publish password reset completed event
            event_bus.publish(
                "PasswordResetCompleted",
                {
                    "user_id": user.id,
                    "email": user.email,
                },
            )

            logger.info(
                "Password reset successfully updated",
                extra={"extra_info": {"user_id": str(user.id), "email": user.email}},
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def _create_login_session(self, user: User) -> LoginResponseData:
        """
        Helper method to generate tokens and construct LoginResponseData for an authenticated user.
        """
        from app.models.refresh_token import RefreshToken
        from app.models.project_member import ProjectMember
        from app.core.security import create_access_token, hash_token

        access_token = create_access_token({"sub": str(user.id)})
        raw_refresh_token = secrets.token_urlsafe(32)
        hashed_refresh_token = hash_token(raw_refresh_token)

        refresh_record = RefreshToken(
            user_id=user.id,
            token=hashed_refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=7),
            revoked=False,
        )
        self.repo.create_refresh_token(refresh_record)
        self.db.commit()

        pm_roles = self.db.scalars(
            select(ProjectMember.role).filter(ProjectMember.user_id == user.id)
        ).all()
        project_roles_str = [r if isinstance(r, str) else r.value for r in pm_roles]
        company_role_str = user.role if isinstance(user.role, str) else user.role.value if user.role else None

        return LoginResponseData(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            role=company_role_str or "MEMBER",
            company_role=company_role_str,
            project_roles=project_roles_str,
        )

    def authenticate_google(self, data: GoogleAuthRequest) -> LoginResponseData:
        """
        Authenticates a user via Google ID Token.
        Verifies token server-side using Google's token verification library.
        Handles:
        1. Existing Google user (oauth_provider="google" & oauth_id) -> Log in.
        2. Existing password user with same email -> Link Google identity -> Log in.
        3. Email matches PendingMembership -> Convert pending invites to ProjectMember records -> Log in.
        4. Brand-new user -> Create new Company + User (CompanyRole.OWNER, is_verified=True) -> Log in.
        """
        from app.core.config import settings
        from app.models.company import Company
        from app.models.user import User
        from app.models.pending_membership import PendingMembership
        from app.models.project_member import ProjectMember
        from app.models.enums import CompanyRole

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests
            id_info = id_token.verify_oauth2_token(
                data.id_token,
                requests.Request(),
                audience=settings.GOOGLE_CLIENT_ID,
            )
        except Exception as e:
            raise InvalidCredentials(f"Invalid Google ID token: {str(e)}")

        google_sub = id_info.get("sub")
        email = id_info.get("email", "").lower().strip()
        if not google_sub or not email:
            raise InvalidCredentials("Google ID token missing sub or email claim.")

        first_name = id_info.get("given_name") or id_info.get("name", "Google User").split()[0]
        name_parts = id_info.get("name", "").split()
        last_name = id_info.get("family_name") or (name_parts[1] if len(name_parts) > 1 else "User")

        # 1. Existing user with this oauth_provider & oauth_id
        existing_google_user = self.db.execute(
            select(User).filter(
                User.oauth_provider == "google",
                User.oauth_id == google_sub,
            )
        ).scalar_one_or_none()

        if existing_google_user:
            return self._create_login_session(existing_google_user)

        # 2. Existing user with this email
        user_by_email = self.repo.get_user_by_email(email)
        if user_by_email:
            try:
                user_by_email.oauth_provider = "google"
                user_by_email.oauth_id = google_sub
                user_by_email.is_verified = True
                self.db.commit()
                return self._create_login_session(user_by_email)
            except Exception as e:
                self.db.rollback()
                raise e

        # 3. Check for PendingMembership (invited user)
        pendings = self.db.execute(
            select(PendingMembership)
            .filter(PendingMembership.email == email)
            .order_by(PendingMembership.created_at.asc())
        ).scalars().all()

        if pendings:
            first_project = pendings[0].project
            company_id = first_project.company_id

            try:
                user = User(
                    company_id=company_id,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password_hash=None,
                    role=None,
                    is_active=True,
                    is_verified=True,
                    profile_completed=True,
                    oauth_provider="google",
                    oauth_id=google_sub,
                )
                self.repo.create_user(user)
                self.db.flush()

                for p in pendings:
                    member = ProjectMember(
                        project_id=p.project_id,
                        user_id=user.id,
                        role=p.role,
                    )
                    self.db.add(member)
                    self.db.delete(p)

                self.db.commit()
                return self._create_login_session(user)
            except Exception as e:
                self.db.rollback()
                raise e

        # If this request comes from the /join page specifically and there is no invitation
        if data.is_join:
            raise BaseBusinessException(
                "No invitation found for this email address. Please request an invitation from your company administrator.",
                status_code=400,
            )

        # 4. Brand-New User -> Create Company as OWNER
        company_name = f"{first_name}'s Organization"
        base_slug = slugify(company_name)
        company_slug = f"{base_slug}-{secrets.token_hex(3)}"

        try:
            company = Company(
                name=company_name,
                slug=company_slug,
                subscription_plan="FREE",
                is_active=True,
            )
            self.repo.create_company(company)
            self.db.flush()

            user = User(
                company_id=company.id,
                first_name=first_name,
                last_name=last_name,
                email=email,
                password_hash=None,
                role=CompanyRole.OWNER,
                is_active=True,
                is_verified=True,
                profile_completed=True,
                oauth_provider="google",
                oauth_id=google_sub,
            )
            self.repo.create_user(user)
            self.db.commit()
            return self._create_login_session(user)
        except Exception as e:
            self.db.rollback()
            raise e

    def update_user_profile(self, user: User, data: UpdateProfileRequest) -> User:
        """
        Updates profile fields for a user.
        Flips profile_completed to True ONLY when both required fields (designation and bio) are non-empty.
        """
        if data.first_name is not None:
            user.first_name = data.first_name.strip()
        if data.last_name is not None:
            user.last_name = data.last_name.strip()
        if data.designation is not None:
            user.designation = data.designation.strip() or None
        if data.bio is not None:
            user.bio = data.bio.strip() or None
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url.strip() or None

        has_designation = bool(user.designation and user.designation.strip())
        has_bio = bool(user.bio and user.bio.strip())

        user.profile_completed = bool(has_designation and has_bio)

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_user_profile_response(self, user: User) -> UserProfileResponse:
        """
        Builds full UserProfileResponse including company details and assigned project memberships with roles.
        """
        company_name = None
        if user.company_id:
            company = self.db.query(Company).filter(Company.id == user.company_id).first()
            if company:
                company_name = company.name

        # Query project memberships
        memberships = (
            self.db.query(ProjectMember, Project)
            .join(Project, ProjectMember.project_id == Project.id)
            .filter(ProjectMember.user_id == user.id)
            .all()
        )

        project_memberships_info = [
            ProjectMembershipInfo(
                project_id=pm.project_id,
                project_name=proj.name,
                project_description=proj.description,
                project_role=pm.role.value if hasattr(pm.role, "value") else str(pm.role),
            )
            for pm, proj in memberships
        ]

        company_role_str = (
            user.role.value if hasattr(user.role, "value") else (user.role if user.role else None)
        )

        return UserProfileResponse(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            company_id=user.company_id,
            company_name=company_name,
            role=company_role_str,
            company_role=company_role_str,
            designation=user.designation,
            avatar_url=user.avatar_url,
            bio=user.bio,
            profile_completed=user.profile_completed,
            is_active=user.is_active,
            is_verified=user.is_verified,
            project_memberships=project_memberships_info,
        )

    def change_password(self, user: User, data: ChangePasswordRequest) -> None:
        """
        Changes current user password after verifying old password.
        """
        if not user.password_hash or not verify_password(data.old_password, user.password_hash):
            raise InvalidCredentials("Current password is incorrect.")

        user.password_hash = hash_password(data.new_password)
        self.db.add(user)
        self.db.commit()

