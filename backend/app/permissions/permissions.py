from app.models.user import User
from app.permissions.roles import ROLE_PERMISSIONS


def has_permission(user: User, permission: str) -> bool:
    """
    Checks if a user has a specific permission based on their role.
    """
    permissions = ROLE_PERMISSIONS.get(user.role, set())
    return "all" in permissions or permission in permissions
