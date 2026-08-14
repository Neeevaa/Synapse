"""shrink projectrole enum to 4 values

Revision ID: c1a2b3c4d5e6
Revises: de50cba9c6a2
Create Date: 2026-08-10 10:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

from app.models.enums import LEGACY_ROLE_TO_SPECIALIZATION

# revision identifiers, used by Alembic.
revision: str = 'c1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'de50cba9c6a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Safely shrinks the PostgreSQL projectrole enum type from 10 values to 4:
    PROJECT_MANAGER, TEAM_LEAD, DEVELOPER, VIEWER.
    Handles project_members, pending_memberships, and invitations tables.
    """
    # 0. Ensure specialization column exists on all tables referencing projectrole
    op.execute("ALTER TABLE project_members ADD COLUMN IF NOT EXISTS specialization VARCHAR(50)")
    op.execute("ALTER TABLE pending_memberships ADD COLUMN IF NOT EXISTS specialization VARCHAR(50)")
    op.execute("ALTER TABLE invitations ADD COLUMN IF NOT EXISTS specialization VARCHAR(50)")

    # 1. Create a new Postgres enum type projectrole_new with exactly 4 valid values
    op.execute(
        "CREATE TYPE projectrole_new AS ENUM ('PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER')"
    )

    # 2. Update specialization for legacy roles across all tables if NULL
    for legacy_role, spec in LEGACY_ROLE_TO_SPECIALIZATION.items():
        op.execute(
            sa.text(
                "UPDATE project_members "
                "SET specialization = :spec "
                "WHERE CAST(role AS TEXT) = :legacy_role "
                "AND specialization IS NULL"
            ).bindparams(spec=spec, legacy_role=legacy_role)
        )
        op.execute(
            sa.text(
                "UPDATE pending_memberships "
                "SET specialization = :spec "
                "WHERE CAST(role AS TEXT) = :legacy_role "
                "AND specialization IS NULL"
            ).bindparams(spec=spec, legacy_role=legacy_role)
        )
        op.execute(
            sa.text(
                "UPDATE invitations "
                "SET specialization = :spec "
                "WHERE CAST(role AS TEXT) = :legacy_role "
                "AND specialization IS NULL"
            ).bindparams(spec=spec, legacy_role=legacy_role)
        )

    # 3. Alter role column to type projectrole_new across all tables
    for table_name in ["project_members", "pending_memberships", "invitations"]:
        op.execute(f"""
            ALTER TABLE {table_name}
            ALTER COLUMN role TYPE projectrole_new
            USING CASE CAST(role AS TEXT)
                WHEN 'PROJECT_MANAGER' THEN 'PROJECT_MANAGER'::projectrole_new
                WHEN 'TEAM_LEAD' THEN 'TEAM_LEAD'::projectrole_new
                WHEN 'DEVELOPER' THEN 'DEVELOPER'::projectrole_new
                WHEN 'VIEWER' THEN 'VIEWER'::projectrole_new
                ELSE 'DEVELOPER'::projectrole_new
            END
        """)

    # 4. Drop the old 10-value projectrole enum type (now safely unreferenced)
    op.execute("DROP TYPE projectrole")

    # 5. Rename projectrole_new to projectrole
    op.execute("ALTER TYPE projectrole_new RENAME TO projectrole")

    # 6. Verification check: ensure no invalid role values remain in project_members or pending_memberships
    conn = op.get_bind()
    invalid_pm_count = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM project_members "
            "WHERE CAST(role AS TEXT) NOT IN ('PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER')"
        )
    ).scalar()
    invalid_pending_count = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM pending_memberships "
            "WHERE CAST(role AS TEXT) NOT IN ('PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER')"
        )
    ).scalar()

    if invalid_pm_count != 0 or invalid_pending_count != 0:
        raise RuntimeError(
            f"Migration verification failed: {invalid_pm_count} row(s) in project_members and "
            f"{invalid_pending_count} row(s) in pending_memberships have invalid roles."
        )


def downgrade() -> None:
    """
    Downgrade schema: Recreates the original 10-value projectrole enum shape and drops specialization.
    Note: Downgrade cannot perfectly restore the original mixed role/specialization values,
    only the enum shape (previously-legacy rows will remain DEVELOPER). This is expected
    and acceptable for a downgrade path.
    """
    # 1. Recreate the old 10-value enum type
    op.execute("""
        CREATE TYPE projectrole_old AS ENUM (
            'PROJECT_MANAGER',
            'TEAM_LEAD',
            'DEVELOPER',
            'BACKEND_DEVELOPER',
            'FRONTEND_DEVELOPER',
            'AI_ENGINEER',
            'UI_UX_DESIGNER',
            'QA_ENGINEER',
            'DEVOPS_ENGINEER',
            'VIEWER'
        )
    """)

    # 2. Alter columns back to projectrole_old across all tables
    for table_name in ["project_members", "pending_memberships", "invitations"]:
        op.execute(f"""
            ALTER TABLE {table_name}
            ALTER COLUMN role TYPE projectrole_old
            USING CAST(role AS TEXT)::projectrole_old
        """)

    # 3. Drop the 4-value projectrole type
    op.execute("DROP TYPE projectrole")

    # 4. Rename projectrole_old to projectrole
    op.execute("ALTER TYPE projectrole_old RENAME TO projectrole")

    # 5. Drop specialization columns
    op.execute("ALTER TABLE project_members DROP COLUMN IF EXISTS specialization")
    op.execute("ALTER TABLE pending_memberships DROP COLUMN IF EXISTS specialization")
    op.execute("ALTER TABLE invitations DROP COLUMN IF EXISTS specialization")
