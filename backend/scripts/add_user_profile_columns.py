import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        print("Migrating users table to add avatar_url and bio columns...")
        conn.execute(
            text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(500);
            """)
        )
        print("Migration complete. Added avatar_url and bio to users table.")


if __name__ == "__main__":
    migrate()
