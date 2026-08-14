"""add_company_resource_allocations

Revision ID: 1cb5f320c206
Revises: 0a5bdd0d97c9
Create Date: 2026-08-12 17:09:00.929296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_company_resource_allocations

Revision ID: 1cb5f320c206
Revises: 0a5bdd0d97c9
Create Date: 2026-08-12 17:09:00.929296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1cb5f320c206'
down_revision: Union[str, Sequence[str], None] = '0a5bdd0d97c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('company_resource_allocations',
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('custom_max_users', sa.Integer(), nullable=True),
    sa.Column('custom_max_projects', sa.Integer(), nullable=True),
    sa.Column('custom_max_storage_bytes', sa.BigInteger(), nullable=True),
    sa.Column('custom_max_ai_executions', sa.Integer(), nullable=True),
    sa.Column('custom_max_automation_workflows', sa.Integer(), nullable=True),
    sa.Column('custom_features_json', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company_id')
    )


def downgrade() -> None:
    op.drop_table('company_resource_allocations')
