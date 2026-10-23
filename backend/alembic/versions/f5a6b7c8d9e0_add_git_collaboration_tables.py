"""add_git_collaboration_tables

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-10-23 23:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, Sequence[str], None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create GitReferenceType enum in Postgres
    git_ref_enum = postgresql.ENUM('COMMIT', 'PULL_REQUEST', name='gitreferencetype', create_type=False)
    git_ref_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create project_git_repositories table
    op.create_table(
        'project_git_repositories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('repository_url', sa.String(length=500), nullable=False),
        sa.Column('repository_name', sa.String(length=255), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.UniqueConstraint('project_id', name='uq_project_git_repositories_project_id')
    )
    op.create_index(
        op.f('ix_project_git_repositories_project_id'),
        'project_git_repositories',
        ['project_id'],
        unique=False
    )

    # 3. Create task_git_references table
    op.create_table(
        'task_git_references',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reference_type', git_ref_enum, nullable=False),
        sa.Column('commit_hash', sa.String(length=64), nullable=True),
        sa.Column('commit_url', sa.String(length=500), nullable=True),
        sa.Column('pull_request_url', sa.String(length=500), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index(
        op.f('ix_task_git_references_project_id'),
        'task_git_references',
        ['project_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_task_git_references_task_id'),
        'task_git_references',
        ['task_id'],
        unique=False
    )
    op.create_index(
        'ix_task_git_references_project_created',
        'task_git_references',
        ['project_id', sa.text('created_at DESC')],
        unique=False
    )
    # Deduplication constraints
    op.create_index(
        'uq_task_git_commit_hash',
        'task_git_references',
        ['task_id', 'commit_hash'],
        unique=True,
        postgresql_where=sa.text("commit_hash IS NOT NULL")
    )
    op.create_index(
        'uq_task_git_pr_url',
        'task_git_references',
        ['task_id', 'pull_request_url'],
        unique=True,
        postgresql_where=sa.text("pull_request_url IS NOT NULL")
    )


def downgrade() -> None:
    op.drop_index('uq_task_git_pr_url', table_name='task_git_references')
    op.drop_index('uq_task_git_commit_hash', table_name='task_git_references')
    op.drop_index('ix_task_git_references_project_created', table_name='task_git_references')
    op.drop_index(op.f('ix_task_git_references_task_id'), table_name='task_git_references')
    op.drop_index(op.f('ix_task_git_references_project_id'), table_name='task_git_references')
    op.drop_table('task_git_references')

    op.drop_index(op.f('ix_project_git_repositories_project_id'), table_name='project_git_repositories')
    op.drop_table('project_git_repositories')

    git_ref_enum = postgresql.ENUM('COMMIT', 'PULL_REQUEST', name='gitreferencetype')
    git_ref_enum.drop(op.get_bind(), checkfirst=True)
