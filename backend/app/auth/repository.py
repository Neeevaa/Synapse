from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.company import Company
from app.models.email_verification import EmailVerificationToken
from app.models.refresh_token import RefreshToken
from app.models.password_reset import PasswordResetToken
from uuid import UUID


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_company_by_name(self, name: str) -> Company | None:
        """
        Queries a company by its exact name.
        """
        return self.db.execute(
            select(Company).filter(Company.name == name)
        ).scalar_one_or_none()

    def get_company_by_slug(self, slug: str) -> Company | None:
        """
        Queries a company by its unique slug.
        """
        return self.db.execute(
            select(Company).filter(Company.slug == slug)
        ).scalar_one_or_none()

    def get_user_by_email(self, email: str) -> User | None:
        """
        Queries a user by their email address.
        """
        return self.db.execute(
            select(User).filter(User.email == email)
        ).scalar_one_or_none()

    def get_user_by_id(self, user_id: UUID | str) -> User | None:
        """
        Queries a user by their user ID.
        """
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        return self.db.execute(
            select(User).filter(User.id == user_id)
        ).scalar_one_or_none()

    def create_company(self, company: Company) -> Company:
        """
        Adds a new company to the session and flushes it to populate its ID.
        """
        self.db.add(company)
        self.db.flush()
        return company

    def create_user(self, user: User) -> User:
        """
        Adds a new user to the session and flushes it to populate their ID.
        """
        self.db.add(user)
        self.db.flush()
        return user

    def create_verification_token(
        self, token: EmailVerificationToken
    ) -> EmailVerificationToken:
        """
        Adds a new email verification token to the session and flushes it.
        """
        self.db.add(token)
        self.db.flush()
        return token

    def create_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
        """
        Adds a new refresh token to the database session and flushes it.
        """
        self.db.add(refresh_token)
        self.db.flush()
        return refresh_token

    def get_email_verification_token(self, token: str) -> EmailVerificationToken | None:
        """
        Queries an email verification token by its token value.
        """
        return self.db.execute(
            select(EmailVerificationToken).filter(EmailVerificationToken.token == token)
        ).scalar_one_or_none()

    def delete_email_verification_token(self, token: EmailVerificationToken) -> None:
        """
        Deletes the email verification token from the database session.
        """
        self.db.delete(token)
        self.db.flush()

    def get_refresh_token_by_token(self, hashed_token: str) -> RefreshToken | None:
        """
        Queries a refresh token by its hashed token value.
        """
        return self.db.execute(
            select(RefreshToken).filter(RefreshToken.token == hashed_token)
        ).scalar_one_or_none()

    def create_password_reset_token(
        self, token: PasswordResetToken
    ) -> PasswordResetToken:
        """
        Adds a new password reset token to the database session and flushes it.
        """
        self.db.add(token)
        self.db.flush()
        return token

    def get_password_reset_token(self, token: str) -> PasswordResetToken | None:
        """
        Queries a password reset token by its token value.
        """
        return self.db.execute(
            select(PasswordResetToken).filter(PasswordResetToken.token == token)
        ).scalar_one_or_none()

    def delete_password_reset_token(self, token: PasswordResetToken) -> None:
        """
        Deletes the password reset token from the database session.
        """
        self.db.delete(token)
        self.db.flush()
