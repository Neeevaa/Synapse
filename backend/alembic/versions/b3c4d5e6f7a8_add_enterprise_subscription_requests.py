"""add_enterprise_subscription_requests

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-09-22 10:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Enum safely
    status_enum = postgresql.ENUM(
        'PENDING', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'ACTIVATED', 'REJECTED', 'CANCELLED',
        name='enterpriserequeststatus'
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create enterprise_subscription_requests table
    op.create_table(
        'enterprise_subscription_requests',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('requested_by', sa.UUID(), nullable=True),
        sa.Column(
            'status',
            postgresql.ENUM(
                'PENDING', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'ACTIVATED', 'REJECTED', 'CANCELLED',
                name='enterpriserequeststatus',
                create_type=False
            ),
            server_default='PENDING',
            nullable=False
        ),
        sa.Column('requested_user_limit', sa.Integer(), server_default='-1', nullable=False),
        sa.Column('requested_project_limit', sa.Integer(), server_default='-1', nullable=False),
        sa.Column('requested_storage_gb', sa.Integer(), server_default='-1', nullable=False),
        sa.Column('requested_ai_executions', sa.Integer(), server_default='-1', nullable=False),
        sa.Column('requested_automation_workflows', sa.Integer(), server_default='-1', nullable=False),
        sa.Column('requested_capabilities', sa.JSON(), nullable=False),
        sa.Column('requested_reason', sa.Text(), nullable=True),
        sa.Column('approved_limits', sa.JSON(), nullable=True),
        sa.Column('approved_capabilities', sa.JSON(), nullable=True),
        sa.Column('calculated_price', sa.Integer(), nullable=True),
        sa.Column('price_breakdown', sa.JSON(), nullable=True),
        sa.Column('pricing_version', sa.String(length=20), nullable=True),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('admin_comment', sa.Text(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Standard Indexes
    op.create_index('ix_enterprise_sub_requests_company_id', 'enterprise_subscription_requests', ['company_id'], unique=False)
    op.create_index('ix_enterprise_sub_requests_requested_by', 'enterprise_subscription_requests', ['requested_by'], unique=False)
    op.create_index('ix_enterprise_sub_requests_status', 'enterprise_subscription_requests', ['status'], unique=False)

    # 4. Partial Unique Index: only 1 active request per company (PENDING, UNDER_REVIEW, PAYMENT_PENDING)
    op.execute("""
        CREATE UNIQUE INDEX uq_enterprise_active_request_per_company
        ON enterprise_subscription_requests (company_id)
        WHERE status IN ('PENDING', 'UNDER_REVIEW', 'PAYMENT_PENDING');
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_enterprise_active_request_per_company;")
    op.drop_index('ix_enterprise_sub_requests_status', table_name='enterprise_subscription_requests')
    op.drop_index('ix_enterprise_sub_requests_requested_by', table_name='enterprise_subscription_requests')
    op.drop_index('ix_enterprise_sub_requests_company_id', table_name='enterprise_subscription_requests')
    op.drop_table('enterprise_subscription_requests')
    op.execute("DROP TYPE IF EXISTS enterpriserequeststatus;")
