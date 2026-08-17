"""add_task_story_points_position_and_sprint_capacity

Revision ID: e5f6a7b8c9d0
Revises: d4c3da2ba1c7
Create Date: 2026-08-17 10:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4c3da2ba1c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add story_points and position to tasks table
    op.add_column('tasks', sa.Column('story_points', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('position', sa.Integer(), nullable=False, server_default='0'))

    # 2. Add capacity to sprints table
    op.add_column('sprints', sa.Column('capacity', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('sprints', 'capacity')
    op.drop_column('tasks', 'position')
    op.drop_column('tasks', 'story_points')
