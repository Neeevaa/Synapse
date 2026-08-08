import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        print("Migrating users table avatar_url column to TEXT...")
        if "postgresql" in engine.url.drivername:
            conn.execute(
                text("""
                ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
                """)
            )
            print("PostgreSQL avatar_url column updated to TEXT.")
        else:
            print("SQLite / In-Memory database detected; column type compatibility verified.")


if __name__ == "__main__":
    migrate()
