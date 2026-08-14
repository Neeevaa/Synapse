"""add_company_status_and_admin_audit_logs

Revision ID: 0a5bdd0d97c9
Revises: f7e6d5c4b3a2
Create Date: 2026-08-12 11:58:06.437094

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_company_status_and_admin_audit_logs

Revision ID: 0a5bdd0d97c9
Revises: f7e6d5c4b3a2
Create Date: 2026-08-12 11:58:06.437094

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a5bdd0d97c9'
down_revision: Union[str, Sequence[str], None] = 'f7e6d5c4b3a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type for company status
    company_status_enum = sa.Enum('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DEACTIVATED', name='companystatus')
    company_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'admin_audit_logs',
        sa.Column('actor_super_admin_id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('previous_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['actor_super_admin_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.add_column('companies', sa.Column('status', sa.Enum('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DEACTIVATED', name='companystatus'), server_default='ACTIVE', nullable=False))


def downgrade() -> None:
    op.drop_column('companies', 'status')
    op.drop_table('admin_audit_logs')
    company_status_enum = sa.Enum('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DEACTIVATED', name='companystatus')
    company_status_enum.drop(op.get_bind(), checkfirst=True)
