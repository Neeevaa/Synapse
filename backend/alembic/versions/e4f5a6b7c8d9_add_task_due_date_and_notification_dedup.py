"""add_task_due_date_and_notification_dedup

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-10-23 22:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add due_date to tasks table
    op.add_column(
        'tasks',
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(op.f('ix_tasks_due_date'), 'tasks', ['due_date'], unique=False)

    # 2. Add deduplication_key to notifications table
    op.add_column(
        'notifications',
        sa.Column('deduplication_key', sa.String(length=255), nullable=True)
    )
    # Deduplication unique index (ignoring NULLs)
    op.create_index(
        'uq_notifications_deduplication_key',
        'notifications',
        ['deduplication_key'],
        unique=True,
        postgresql_where=sa.text("deduplication_key IS NOT NULL")
    )

    # 3. Fast recipient + created_at compound index
    op.create_index(
        'ix_notifications_recipient_created_at',
        'notifications',
        ['recipient_user_id', sa.text('created_at DESC')],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_notifications_recipient_created_at', table_name='notifications')
    op.drop_index('uq_notifications_deduplication_key', table_name='notifications')
    op.drop_column('notifications', 'deduplication_key')

    op.drop_index(op.f('ix_tasks_due_date'), table_name='tasks')
    op.drop_column('tasks', 'due_date')
