"""add_google_oauth_fields_to_users

Revision ID: a9b8c7d6e5f4
Revises: 1d48bc523904
Create Date: 2026-08-03 02:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9b8c7d6e5f4'
down_revision: Union[str, Sequence[str], None] = '1d48bc523904'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.add_column('users', sa.Column('oauth_provider', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('oauth_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_users_oauth_id'), 'users', ['oauth_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_oauth_id'), table_name='users')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
