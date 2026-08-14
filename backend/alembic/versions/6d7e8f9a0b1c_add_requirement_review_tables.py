"""add_requirement_review_tables

Revision ID: 6d7e8f9a0b1c
Revises: 5c6d7e8f9a0b
Create Date: 2026-08-13 01:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '6d7e8f9a0b1c'
down_revision = '5c6d7e8f9a0b'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create ENUM types safely
    status_enum = postgresql.ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', name='requirementreviewstatus')
    status_enum.create(op.get_bind(), checkfirst=True)

    issue_type_enum = postgresql.ENUM('AMBIGUITY', 'INCOMPLETENESS', 'INCONSISTENCY', 'CONFLICT', 'MISSING_ACCEPTANCE_CRITERIA', 'MISSING_EDGE_CASE', 'UNCLEAR_ACTOR', 'UNCLEAR_BEHAVIOR', 'TESTABILITY', 'OTHER', name='reviewissuetype')
    issue_type_enum.create(op.get_bind(), checkfirst=True)

    severity_enum = postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='reviewseverity')
    severity_enum.create(op.get_bind(), checkfirst=True)

    evidence_status_enum = postgresql.ENUM('GROUNDED', 'INSUFFICIENT_CONTEXT', name='findingevidencestatus')
    evidence_status_enum.create(op.get_bind(), checkfirst=True)

    decision_enum = postgresql.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED', name='findinghumandecision')
    decision_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create requirement_reviews table
    op.create_table(
        'requirement_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requirements.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requirement_version_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requirement_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ai_job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_jobs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', postgresql.ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', name='requirementreviewstatus', create_type=False), nullable=False, server_default='QUEUED'),
        sa.Column('model_name', sa.String(100), nullable=False, server_default='mock-deterministic-v1'),
        sa.Column('prompt_version', sa.String(100), nullable=False, server_default='REQUIREMENT_REVIEW_PROMPT_V1'),
        sa.Column('retrieval_top_k', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('retrieved_chunk_ids', sa.JSON(), nullable=True),
        sa.Column('similarity_scores', sa.JSON(), nullable=True),
        sa.Column('retrieval_latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('generation_latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total_latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('raw_output_json', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_requirement_reviews_requirement_id'), 'requirement_reviews', ['requirement_id'], unique=False)
    op.create_index(op.f('ix_requirement_reviews_requirement_version_id'), 'requirement_reviews', ['requirement_version_id'], unique=False)
    op.create_index(op.f('ix_requirement_reviews_project_id'), 'requirement_reviews', ['project_id'], unique=False)
    op.create_index(op.f('ix_requirement_reviews_company_id'), 'requirement_reviews', ['company_id'], unique=False)
    op.create_index(op.f('ix_requirement_reviews_ai_job_id'), 'requirement_reviews', ['ai_job_id'], unique=False)
    op.create_index(op.f('ix_requirement_reviews_status'), 'requirement_reviews', ['status'], unique=False)

    # 3. Create requirement_review_findings table
    op.create_table(
        'requirement_review_findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('review_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requirement_reviews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('severity', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='reviewseverity', create_type=False), nullable=False),
        sa.Column('issue_type', postgresql.ENUM('AMBIGUITY', 'INCOMPLETENESS', 'INCONSISTENCY', 'CONFLICT', 'MISSING_ACCEPTANCE_CRITERIA', 'MISSING_EDGE_CASE', 'UNCLEAR_ACTOR', 'UNCLEAR_BEHAVIOR', 'TESTABILITY', 'OTHER', name='reviewissuetype', create_type=False), nullable=False),
        sa.Column('evidence_status', postgresql.ENUM('GROUNDED', 'INSUFFICIENT_CONTEXT', name='findingevidencestatus', create_type=False), nullable=False, server_default='GROUNDED'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('evidence', sa.Text(), nullable=False),
        sa.Column('recommendation', sa.Text(), nullable=False),
        sa.Column('source_references', sa.JSON(), nullable=False),
        sa.Column('human_decision', postgresql.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'MODIFIED', name='findinghumandecision', create_type=False), nullable=False, server_default='PENDING'),
        sa.Column('human_comment', sa.Text(), nullable=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_requirement_review_findings_review_id'), 'requirement_review_findings', ['review_id'], unique=False)
    op.create_index(op.f('ix_requirement_review_findings_severity'), 'requirement_review_findings', ['severity'], unique=False)
    op.create_index(op.f('ix_requirement_review_findings_issue_type'), 'requirement_review_findings', ['issue_type'], unique=False)
    op.create_index(op.f('ix_requirement_review_findings_evidence_status'), 'requirement_review_findings', ['evidence_status'], unique=False)
    op.create_index(op.f('ix_requirement_review_findings_human_decision'), 'requirement_review_findings', ['human_decision'], unique=False)


def downgrade():
    op.drop_table('requirement_review_findings')
    op.drop_table('requirement_reviews')
    op.execute('DROP TYPE IF EXISTS findinghumandecision')
    op.execute('DROP TYPE IF EXISTS findingevidencestatus')
    op.execute('DROP TYPE IF EXISTS reviewseverity')
    op.execute('DROP TYPE IF EXISTS reviewissuetype')
    op.execute('DROP TYPE IF EXISTS requirementreviewstatus')
