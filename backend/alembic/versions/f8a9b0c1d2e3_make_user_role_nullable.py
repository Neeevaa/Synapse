"""make_user_role_nullable

Revision ID: f8a9b0c1d2e3
Revises: e5f6a7b8c9d0
Create Date: 2026-08-17 19:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f8a9b0c1d2e3'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('users', 'role', existing_type=sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='companyrole'), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('users', 'role', existing_type=sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='companyrole'), nullable=False)
