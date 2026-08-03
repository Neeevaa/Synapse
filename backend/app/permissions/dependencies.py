from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole
from app.models.user import User
from app.common.exceptions import Unauthorized, Forbidden
from app.core.security import decode_token
from app.db.session import get_db
from app.auth.repository import AuthRepository

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Retrieves the current authenticated user by validating the JWT token in Authorization header.
    """
    if not credentials:
        raise Unauthorized("Authentication credentials are missing.")

    token = credentials.credentials
    # decode_token automatically handles signature and expiry validation,
    # raising custom exceptions which propagate to standardized responses.
    payload = decode_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise Unauthorized("Invalid token payload: user identifier missing.")

    repo = AuthRepository(db)
    user = repo.get_user_by_id(user_id)
    if not user:
        raise Unauthorized("User not found.")

    if not user.is_active:
        raise Unauthorized("User account is deactivated.")

    return user


def require_role(allowed_roles: list[CompanyRole | ProjectRole]):
    """
    Dependency factory to restrict access to specific roles.
    Bypassed for CompanyRole.OWNER.
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        # OWNER always bypasses checks
        if current_user.role == CompanyRole.OWNER:
            return current_user

        # Match against CompanyRole
        if current_user.role in allowed_roles:
            return current_user

        # Raise Forbidden if no role matches
        raise Forbidden("You do not have permission to access this resource.")

    return dependency


def require_owner():
    return require_role([CompanyRole.OWNER])


def require_admin():
    return require_role([CompanyRole.OWNER, CompanyRole.ADMIN])
