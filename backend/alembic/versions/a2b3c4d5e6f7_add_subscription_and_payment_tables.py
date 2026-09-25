"""add_subscription_and_payment_tables

Revision ID: a2b3c4d5e6f7
Revises: f1e2d3c4b5a6
Create Date: 2026-09-14 14:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('plan', postgresql.ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE', name='subscriptionplan', create_type=False), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
        sa.Column('razorpay_subscription_id', sa.String(length=100), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_subscriptions_company_id', 'subscriptions', ['company_id'], unique=True)

    # 2. Payment Orders table
    op.create_table(
        'payment_orders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('plan', postgresql.ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE', name='subscriptionplan', create_type=False), nullable=False),
        sa.Column('razorpay_order_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='CREATED', nullable=False),
        sa.Column('receipt', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payment_orders_company_id', 'payment_orders', ['company_id'], unique=False)
    op.create_index('ix_payment_orders_razorpay_order_id', 'payment_orders', ['razorpay_order_id'], unique=True)

    # 3. Payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('subscription_id', sa.UUID(), nullable=True),
        sa.Column('order_id', sa.UUID(), nullable=True),
        sa.Column('razorpay_order_id', sa.String(length=100), nullable=False),
        sa.Column('razorpay_payment_id', sa.String(length=100), nullable=True),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='SUCCESS', nullable=False),
        sa.Column('razorpay_signature', sa.String(length=255), nullable=True),
        sa.Column('method', sa.String(length=50), nullable=True),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('error_description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['payment_orders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payments_company_id', 'payments', ['company_id'], unique=False)
    op.create_index('ix_payments_razorpay_order_id', 'payments', ['razorpay_order_id'], unique=False)
    op.create_index('ix_payments_razorpay_payment_id', 'payments', ['razorpay_payment_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_payments_razorpay_payment_id', table_name='payments')
    op.drop_index('ix_payments_razorpay_order_id', table_name='payments')
    op.drop_index('ix_payments_company_id', table_name='payments')
    op.drop_table('payments')

    op.drop_index('ix_payment_orders_razorpay_order_id', table_name='payment_orders')
    op.drop_index('ix_payment_orders_company_id', table_name='payment_orders')
    op.drop_table('payment_orders')

    op.drop_index('ix_subscriptions_company_id', table_name='subscriptions')
    op.drop_table('subscriptions')
