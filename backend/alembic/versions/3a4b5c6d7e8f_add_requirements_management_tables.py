"""add_requirements_management_tables

Revision ID: 3a4b5c6d7e8f
Revises: 2f7c8d9e0a1b
Create Date: 2026-08-13 00:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3a4b5c6d7e8f'
down_revision: Union[str, Sequence[str], None] = '2f7c8d9e0a1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create PostgreSQL Enums safely if not existing
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requirementtype') THEN "
        "CREATE TYPE requirementtype AS ENUM ('FUNCTIONAL', 'NON_FUNCTIONAL', 'USER_STORY'); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requirementstatus') THEN "
        "CREATE TYPE requirementstatus AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requirementpriority') THEN "
        "CREATE TYPE requirementpriority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT'); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requirementsource') THEN "
        "CREATE TYPE requirementsource AS ENUM ('SRS', 'USER_STORY', 'MEETING', 'MANUAL_ENTRY', 'IMPORTED_DOCUMENT', 'OTHER'); "
        "END IF; END $$;"
    )

    req_type_enum = postgresql.ENUM('FUNCTIONAL', 'NON_FUNCTIONAL', 'USER_STORY', name='requirementtype', create_type=False)
    req_status_enum = postgresql.ENUM('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED', name='requirementstatus', create_type=False)
    req_priority_enum = postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='requirementpriority', create_type=False)
    req_source_enum = postgresql.ENUM('SRS', 'USER_STORY', 'MEETING', 'MANUAL_ENTRY', 'IMPORTED_DOCUMENT', 'OTHER', name='requirementsource', create_type=False)

    # 2. Create requirements table
    op.create_table(
        'requirements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('requirement_key', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('requirement_type', req_type_enum, nullable=False, server_default='FUNCTIONAL'),
        sa.Column('priority', req_priority_enum, nullable=False, server_default='MEDIUM'),
        sa.Column('status', req_status_enum, nullable=False, server_default='DRAFT'),
        sa.Column('source', req_source_enum, nullable=False, server_default='MANUAL_ENTRY'),
        sa.Column('acceptance_criteria', sa.Text(), nullable=True),
        sa.Column('current_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_requirements_company_id', 'requirements', ['company_id'], unique=False)
    op.create_index('ix_requirements_project_id', 'requirements', ['project_id'], unique=False)
    op.create_index('ix_requirements_requirement_key', 'requirements', ['requirement_key'], unique=False)

    # 3. Create requirement_versions table
    op.create_table(
        'requirement_versions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('requirement_id', sa.UUID(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('acceptance_criteria', sa.Text(), nullable=True),
        sa.Column('requirement_type', req_type_enum, nullable=False),
        sa.Column('priority', req_priority_enum, nullable=False),
        sa.Column('status', req_status_enum, nullable=False),
        sa.Column('source', req_source_enum, nullable=False),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requirement_id'], ['requirements.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_requirement_versions_requirement_id', 'requirement_versions', ['requirement_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_requirement_versions_requirement_id', table_name='requirement_versions')
    op.drop_table('requirement_versions')

    op.drop_index('ix_requirements_requirement_key', table_name='requirements')
    op.drop_index('ix_requirements_project_id', table_name='requirements')
    op.drop_index('ix_requirements_company_id', table_name='requirements')
    op.drop_table('requirements')

    op.execute("DROP TYPE IF EXISTS requirementsource")
    op.execute("DROP TYPE IF EXISTS requirementpriority")
    op.execute("DROP TYPE IF EXISTS requirementstatus")
    op.execute("DROP TYPE IF EXISTS requirementtype")
