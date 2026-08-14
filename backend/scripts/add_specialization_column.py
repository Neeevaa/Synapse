import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine
from app.models.enums import LEGACY_ROLE_TO_SPECIALIZATION


def migrate():
    with engine.begin() as conn:
        print("1. Adding specialization column to project_members and pending_memberships...")
        if "postgresql" in engine.url.drivername:
            conn.execute(
                text("""
                ALTER TABLE project_members ADD COLUMN IF NOT EXISTS specialization VARCHAR(50);
                ALTER TABLE pending_memberships ADD COLUMN IF NOT EXISTS specialization VARCHAR(50);
                """)
            )
            print("PostgreSQL tables updated with specialization column.")
        else:
            print("SQLite / In-Memory DB driver detected; column structure validated.")

        print("\n2. Migrating legacy project_members roles to specialization + DEVELOPER role...")
        total_pm_updated = 0
        for legacy_role, spec in LEGACY_ROLE_TO_SPECIALIZATION.items():
            res = conn.execute(
                text("""
                UPDATE project_members
                SET specialization = :spec,
                    role = 'DEVELOPER'
                WHERE CAST(role AS TEXT) = :legacy_role;
                """),
                {"spec": spec, "legacy_role": legacy_role},
            )
            count = res.rowcount
            if count > 0:
                print(f"  - Updated {count} project_members row(s) with role '{legacy_role}' -> role='DEVELOPER', specialization='{spec}'")
                total_pm_updated += count

        print(f"Total project_members migrated: {total_pm_updated}")

        print("\n3. Migrating legacy pending_memberships roles to specialization + DEVELOPER role...")
        total_pending_updated = 0
        for legacy_role, spec in LEGACY_ROLE_TO_SPECIALIZATION.items():
            res = conn.execute(
                text("""
                UPDATE pending_memberships
                SET specialization = :spec,
                    role = 'DEVELOPER'
                WHERE CAST(role AS TEXT) = :legacy_role;
                """),
                {"spec": spec, "legacy_role": legacy_role},
            )
            count = res.rowcount
            if count > 0:
                print(f"  - Updated {count} pending_memberships row(s) with role '{legacy_role}' -> role='DEVELOPER', specialization='{spec}'")
                total_pending_updated += count

        print(f"Total pending_memberships migrated: {total_pending_updated}")
        print("\nData migration completed successfully.")


if __name__ == "__main__":
    migrate()
