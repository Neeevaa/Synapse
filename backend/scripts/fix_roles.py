import sys
import os

# Add parent directory to sys.path so app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.enums import CompanyRole, ProjectRole


def audit_and_fix_roles(apply_changes: bool = False):
    db = SessionLocal()
    try:
        print("=" * 70)
        print("ROLE DATA CORRECTION AUDIT REPORT")
        print("=" * 70)

        # 1. Audit Users with CompanyRole.ADMIN created via invitation flow
        # In Synapse, company creators have role=CompanyRole.OWNER.
        # Users registered via team invitations were incorrectly assigned CompanyRole.ADMIN.
        admin_users_query = select(User).filter(User.role == CompanyRole.ADMIN)
        admin_users = db.execute(admin_users_query).scalars().all()

        print(f"\n[1] Users with CompanyRole.ADMIN to be updated to role=None: {len(admin_users)}")
        if admin_users:
            for u in admin_users:
                print(f"  - User ID: {u.id} | Name: {u.first_name} {u.last_name} | Email: {u.email} | Current Role: {u.role}")
        else:
            print("  (No affected users found)")

        # 2. Audit ProjectMember rows where creator has role=DEVELOPER
        creator_members_query = (
            select(ProjectMember, Project.name.label("project_name"))
            .join(Project, ProjectMember.project_id == Project.id)
            .filter(
                ProjectMember.user_id == Project.created_by,
                ProjectMember.role == ProjectRole.DEVELOPER,
            )
        )
        results = db.execute(creator_members_query).all()

        print(f"\n[2] ProjectCreator ProjectMember rows with role=DEVELOPER to be updated to PROJECT_MANAGER: {len(results)}")
        if results:
            for member, proj_name in results:
                print(f"  - ProjectMember ID: {member.id} | Project: '{proj_name}' ({member.project_id}) | User ID: {member.user_id} | Current Role: {member.role}")
        else:
            print("  (No affected ProjectMember rows found)")

        print("\n" + "=" * 70)

        if not apply_changes:
            print("DRY-RUN COMPLETE: No changes were committed to the database.")
            print("To apply these changes, run: python scripts/fix_roles.py --apply")
            return admin_users, results

        # Apply changes if explicitly requested
        print("\nAPPLYING CORRECTIONS...")

        # Drop NOT NULL constraint on users.role column if present
        from sqlalchemy import text
        try:
            db.execute(text("ALTER TABLE users ALTER COLUMN role DROP NOT NULL;"))
            db.commit()
            print("  - Dropped NOT NULL constraint on users.role column.")
        except Exception as e:
            db.rollback()
            print(f"  - Note on ALTER TABLE: {e}")

        users_updated = 0
        for u in admin_users:
            u.role = None
            users_updated += 1

        members_updated = 0
        for member, _ in results:
            member.role = ProjectRole.PROJECT_MANAGER
            members_updated += 1

        db.commit()
        print(f"SUCCESS: Updated {users_updated} user(s) and {members_updated} ProjectMember record(s).")
        return admin_users, results

    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to run role correction script: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    apply_flag = "--apply" in sys.argv
    audit_and_fix_roles(apply_changes=apply_flag)
