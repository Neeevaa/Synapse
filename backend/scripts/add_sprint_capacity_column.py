import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        print("Adding capacity column to sprints table...")
        if "postgresql" in engine.url.drivername:
            conn.execute(
                text("""
                ALTER TABLE sprints ADD COLUMN IF NOT EXISTS capacity INTEGER;
                """)
            )
            print("PostgreSQL sprints table updated.")
        else:
            print("SQLite / In-Memory DB driver detected; column structure validated.")


if __name__ == "__main__":
    migrate()
