import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.models.base import Base
from app.models.company import Company
from app.models.user import User
from app.models.enums import CompanyRole
from app.core.security import hash_password


def seed_demo_user():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        email = "ceo@incial.com"
        passwords = ["admin@synapse", "password123", "ceo@incial", "12345678"]

        # Check or create company
        company = db.query(Company).filter(Company.slug == "incial-corp").first()
        if not company:
            company = Company(
                name="Incial Corp",
                slug="incial-corp",
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"[+] User '{email}' already exists. Updating credentials...")
            user.password_hash = hash_password("admin@synapse")
            user.is_verified = True
            user.is_active = True
            user.profile_completed = True
            user.company_id = company.id
            user.role = CompanyRole.ADMIN
            user.is_super_admin = True
            db.commit()
            print(f"[+] Successfully updated user '{email}' with password 'admin@synapse'")
        else:
            user = User(
                email=email,
                password_hash=hash_password("admin@synapse"),
                first_name="CEO",
                last_name="Incial",
                company_id=company.id,
                role=CompanyRole.ADMIN,
                is_super_admin=True,
                is_verified=True,
                is_active=True,
                profile_completed=True,
            )
            db.add(user)
            db.commit()
            print(f"[+] Successfully created demo CEO user '{email}' with password 'admin@synapse'")

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding demo user: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_user()
