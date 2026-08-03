from app.models.enums import CompanyRole

# Simple mapping of company roles to logical permissions
ROLE_PERMISSIONS = {
    CompanyRole.OWNER: {"all", "manage_company", "manage_members", "manage_projects"},
    CompanyRole.ADMIN: {"manage_members", "manage_projects"},
}
