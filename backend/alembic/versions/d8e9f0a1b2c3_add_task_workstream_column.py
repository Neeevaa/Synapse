"""add_task_workstream_column

Revision ID: d8e9f0a1b2c3
Revises: f92026072800
Create Date: 2026-08-14 10:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd8e9f0a1b2c3'
down_revision = '7e8f9a0b1c2d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create taskworkstream enum type safely
    taskworkstream_enum = postgresql.ENUM(
        'UI_UX', 'FRONTEND', 'BACKEND', 'QA', 'DEVOPS', 'AI_ML', 'GENERAL',
        name='taskworkstream'
    )
    taskworkstream_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add workstream column to tasks
    op.add_column(
        'tasks',
        sa.Column(
            'workstream',
            sa.Enum('UI_UX', 'FRONTEND', 'BACKEND', 'QA', 'DEVOPS', 'AI_ML', 'GENERAL', name='taskworkstream'),
            nullable=True,
            server_default='GENERAL'
        )
    )


def downgrade() -> None:
    op.drop_column('tasks', 'workstream')
    op.execute("DROP TYPE IF EXISTS taskworkstream")
