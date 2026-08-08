import sys
import os

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def add_columns():
    with engine.begin() as conn:
        print("Ensuring company profile and settings columns exist in database...")
        conn.execute(
            text("""
            ALTER TABLE companies
            ADD COLUMN IF NOT EXISTS description TEXT NULL,
            ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) NULL,
            ADD COLUMN IF NOT EXISTS default_project_visibility VARCHAR(50) DEFAULT 'PRIVATE';
            """)
        )
        print("Database schema migration completed successfully.")


if __name__ == "__main__":
    add_columns()
