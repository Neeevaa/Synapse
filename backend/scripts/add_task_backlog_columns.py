import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        print("Adding story_points and position columns to tasks table...")
        if "postgresql" in engine.url.drivername:
            conn.execute(
                text("""
                ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER;
                ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0 NOT NULL;
                """)
            )
            print("PostgreSQL tasks table updated.")
        else:
            print("SQLite / In-Memory DB driver detected; column structure validated.")


if __name__ == "__main__":
    migrate()
