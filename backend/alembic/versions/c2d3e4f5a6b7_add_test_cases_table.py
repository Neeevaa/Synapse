"""add_test_cases_table

Revision ID: c2d3e4f5a6b7
Revises: b3c4d5e6f7a8
Create Date: 2026-10-01 13:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Enums safely
    category_enum = postgresql.ENUM(
        'FUNCTIONAL', 'NEGATIVE', 'BOUNDARY', 'ACCEPTANCE',
        name='testcasecategory'
    )
    category_enum.create(op.get_bind(), checkfirst=True)

    status_enum = postgresql.ENUM(
        'DRAFT', 'APPROVED', 'REJECTED',
        name='testcasestatus'
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    priority_enum = postgresql.ENUM(
        'LOW', 'MEDIUM', 'HIGH', 'URGENT',
        name='testcasepriority'
    )
    priority_enum.create(op.get_bind(), checkfirst=True)

    source_enum = postgresql.ENUM(
        'AI_GENERATED', 'MANUAL',
        name='testcasesource'
    )
    source_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create test_cases table
    op.create_table(
        'test_cases',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('requirement_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column(
            'category',
            postgresql.ENUM('FUNCTIONAL', 'NEGATIVE', 'BOUNDARY', 'ACCEPTANCE', name='testcasecategory', create_type=False),
            server_default='FUNCTIONAL',
            nullable=False
        ),
        sa.Column(
            'priority',
            postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='testcasepriority', create_type=False),
            server_default='MEDIUM',
            nullable=False
        ),
        sa.Column(
            'status',
            postgresql.ENUM('DRAFT', 'APPROVED', 'REJECTED', name='testcasestatus', create_type=False),
            server_default='DRAFT',
            nullable=False
        ),
        sa.Column(
            'source',
            postgresql.ENUM('AI_GENERATED', 'MANUAL', name='testcasesource', create_type=False),
            server_default='AI_GENERATED',
            nullable=False
        ),
        sa.Column('preconditions', sa.Text(), nullable=True),
        sa.Column('test_steps', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('expected_result', sa.Text(), nullable=False),
        sa.Column('test_data', sa.Text(), nullable=True),
        sa.Column('generation_metadata', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('approved_by', sa.UUID(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requirement_id'], ['requirements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(op.f('ix_test_cases_company_id'), 'test_cases', ['company_id'], unique=False)
    op.create_index(op.f('ix_test_cases_project_id'), 'test_cases', ['project_id'], unique=False)
    op.create_index(op.f('ix_test_cases_requirement_id'), 'test_cases', ['requirement_id'], unique=False)
    op.create_index(op.f('ix_test_cases_category'), 'test_cases', ['category'], unique=False)
    op.create_index(op.f('ix_test_cases_status'), 'test_cases', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_test_cases_status'), table_name='test_cases')
    op.drop_index(op.f('ix_test_cases_category'), table_name='test_cases')
    op.drop_index(op.f('ix_test_cases_requirement_id'), table_name='test_cases')
    op.drop_index(op.f('ix_test_cases_project_id'), table_name='test_cases')
    op.drop_index(op.f('ix_test_cases_company_id'), table_name='test_cases')
    op.drop_table('test_cases')

    postgresql.ENUM(name='testcasesource').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='testcasepriority').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='testcasestatus').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='testcasecategory').drop(op.get_bind(), checkfirst=True)
