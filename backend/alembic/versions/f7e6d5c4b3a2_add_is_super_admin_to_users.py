"""add is_super_admin to users and make company_id nullable

Revision ID: f7e6d5c4b3a2
Revises: c1a2b3c4d5e6
Create Date: 2026-08-11 19:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7e6d5c4b3a2'
down_revision: Union[str, Sequence[str], None] = 'c1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_super_admin column with default false
    op.add_column('users', sa.Column('is_super_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    # Make company_id nullable for platform-level super admins
    op.alter_column('users', 'company_id', existing_type=sa.UUID(), nullable=True)


def downgrade() -> None:
    # Make company_id non-nullable
    op.alter_column('users', 'company_id', existing_type=sa.UUID(), nullable=False)
    # Drop is_super_admin column
    op.drop_column('users', 'is_super_admin')
