"""add DEVELOPER to projectrole enum

Revision ID: f92026072800
Revises: eb310a0afdec
Create Date: 2026-07-28 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f92026072800'
down_revision: Union[str, Sequence[str], None] = 'eb310a0afdec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE projectrole ADD VALUE IF NOT EXISTS 'DEVELOPER'")


def downgrade() -> None:
    pass
