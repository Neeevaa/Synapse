"""add_user_profile_fields

Revision ID: d4c3da2ba1c7
Revises: a4b754ec6d86
Create Date: 2026-08-14 23:25:50.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4c3da2ba1c7'
down_revision: Union[str, Sequence[str], None] = 'a4b754ec6d86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('avatar_url', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('bio', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'bio')
    op.drop_column('users', 'avatar_url')
