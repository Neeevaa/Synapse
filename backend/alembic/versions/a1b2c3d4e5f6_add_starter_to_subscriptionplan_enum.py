"""add_starter_to_subscriptionplan_enum

Revision ID: a1b2c3d4e5f6
Revises: f8a9b0c1d2e3
Create Date: 2026-08-17 19:59:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f8a9b0c1d2e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Execute ALTER TYPE outside transaction block if necessary
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'STARTER'"))


def downgrade() -> None:
    """Downgrade schema."""
    # Enum values in PostgreSQL cannot be removed without re-creating the enum type
    pass
