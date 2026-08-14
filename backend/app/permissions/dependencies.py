from uuid import UUID
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.common.exceptions import Unauthorized, Forbidden, ResourceNotFound
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


def require_super_admin():
    """
    Dependency factory to restrict access strictly to platform Super Admins (is_super_admin == True).
    Independent of company_id or project_id context.
    """
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_super_admin:
            return current_user
        raise Forbidden("Only platform Super Admins can access this resource.")

    return dependency


def check_project_role_or_company_admin(
    db: Session,
    user: User,
    project_id: UUID,
    allowed_project_roles: list[ProjectRole] | None = None,
) -> Project:
    """
    Verifies project access and permissions for a user:
    1. Rejects cross-tenant access if project.company_id != user.company_id.
    2. Allows company OWNER or ADMIN.
    3. Allows user if their ProjectMember.role for project_id matches allowed_project_roles (or any ProjectMember if None).
    """
    project = db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
    if not project:
        raise ResourceNotFound("Project not found.")

    if str(project.company_id) != str(user.company_id):
        raise Forbidden("You do not have access to this project.")

    # Company OWNER or ADMIN passes regardless of project membership
    if user.role in (CompanyRole.OWNER, CompanyRole.ADMIN):
        return project

    # Check scoped ProjectRole
    pm = db.execute(
        select(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    ).scalar_one_or_none()

    if not pm:
        raise Forbidden("You do not have access to this project.")

    if allowed_project_roles is None or pm.role in allowed_project_roles:
        return project

    raise Forbidden("Only Project Managers, Admins, or Owners can update project details.")


require_project_role_or_company_admin = check_project_role_or_company_admin

