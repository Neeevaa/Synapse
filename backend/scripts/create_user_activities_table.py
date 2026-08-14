import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.database import engine


def migrate():
    with engine.begin() as conn:
        print("Creating user_activities table...")
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS user_activities (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                description VARCHAR(500) NOT NULL,
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_user_activities_user_id ON user_activities (user_id);
            CREATE INDEX IF NOT EXISTS ix_user_activities_company_id ON user_activities (company_id);
            CREATE INDEX IF NOT EXISTS ix_user_activities_action ON user_activities (action);
            """)
        )
        print("Migration complete. Created user_activities table and indexes.")


if __name__ == "__main__":
    migrate()
