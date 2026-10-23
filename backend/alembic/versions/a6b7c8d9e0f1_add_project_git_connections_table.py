"""add_project_git_connections_table

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-10-24 01:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a6b7c8d9e0f1'
down_revision: Union[str, Sequence[str], None] = 'f5a6b7c8d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_git_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('encrypted_pat', sa.Text(), nullable=False),
        sa.Column('github_username', sa.String(length=255), nullable=False),
        sa.Column('github_user_id', sa.String(length=255), nullable=True),
        sa.Column('github_avatar_url', sa.String(length=500), nullable=True),
        sa.Column('token_type', sa.String(length=50), nullable=False, server_default='pat'),
        sa.Column('is_valid', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_tested_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('connected_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.UniqueConstraint('project_id', name='uq_project_git_connections_project_id')
    )
    op.create_index(
        op.f('ix_project_git_connections_project_id'),
        'project_git_connections',
        ['project_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_project_git_connections_project_id'), table_name='project_git_connections')
    op.drop_table('project_git_connections')
