import sys
import os

# Add parent directory to python path for app imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def seed_super_admin():
    db = SessionLocal()
    try:
        emails = ["adminsynapse2255@gmail.com", "synapseadmin2255@gmail.com"]
        raw_password = "admin@synapse"

        for email in emails:
            existing_user = db.execute(
                select(User).filter(User.email == email)
            ).scalar_one_or_none()

            if existing_user:
                print(f"User with email '{email}' already exists. Updating is_super_admin = True...")
                existing_user.is_super_admin = True
                existing_user.is_verified = True
                existing_user.password_hash = hash_password(raw_password)
                db.commit()
                print(f"Successfully updated user '{email}' to Super Admin.")
            else:
                print(f"Creating new Super Admin account for '{email}'...")
                super_admin = User(
                    email=email,
                    password_hash=hash_password(raw_password),
                    first_name="Super",
                    last_name="Admin",
                    company_id=None,
                    role=None,
                    is_super_admin=True,
                    is_verified=True,
                    is_active=True,
                    profile_completed=True,
                )
                db.add(super_admin)
                db.commit()
                print(f"Successfully seeded Super Admin account '{email}'.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding Super Admin: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_super_admin()
