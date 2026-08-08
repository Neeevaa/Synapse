import sys
import os

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def update_enum():
    with engine.begin() as conn:
        print("Migrating database subscriptionplan enum to include STARTER...")
        # Check if database is PostgreSQL
        if "postgresql" in engine.url.drivername:
            conn.execute(
                text("""
                ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'STARTER';
                """)
            )
            print("PostgreSQL enum type updated with 'STARTER'.")
        else:
            print("Non-PostgreSQL engine detected (SQLite / In-Memory); enum compatibility check passed.")


if __name__ == "__main__":
    update_enum()
