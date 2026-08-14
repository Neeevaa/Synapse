"""add_missing_company_columns

Revision ID: a4b754ec6d86
Revises: b210ab5931b0
Create Date: 2026-08-14 23:25:15.640446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4b754ec6d86'
down_revision: Union[str, Sequence[str], None] = 'b210ab5931b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('companies', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('companies', sa.Column('logo_url', sa.String(length=500), nullable=True))
    op.add_column('companies', sa.Column('default_project_visibility', sa.String(length=50), nullable=False, server_default='PRIVATE'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('companies', 'default_project_visibility')
    op.drop_column('companies', 'logo_url')
    op.drop_column('companies', 'description')
