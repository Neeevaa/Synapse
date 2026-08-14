"""add_evaluation_framework_tables

Revision ID: 7e8f9a0b1c2d
Revises: 6d7e8f9a0b1c
Create Date: 2026-08-13 03:24:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7e8f9a0b1c2d'
down_revision = '6d7e8f9a0b1c'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create ENUM types safely
    condition_enum = postgresql.ENUM('LLM_ONLY', 'RAG_LLM', 'RAG_LLM_HUMAN', name='evaluationcondition')
    condition_enum.create(op.get_bind(), checkfirst=True)

    casetype_enum = postgresql.ENUM('CONTEXT_RICH', 'CONTEXT_POOR', name='evaluationcasetype')
    casetype_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create evaluation_datasets table
    op.create_table(
        'evaluation_datasets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(50), nullable=False, server_default='1.0'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )

    # 3. Create evaluation_cases table
    op.create_table(
        'evaluation_cases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('dataset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evaluation_datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_type', postgresql.ENUM('CONTEXT_RICH', 'CONTEXT_POOR', name='evaluationcasetype', create_type=False), nullable=False, server_default='CONTEXT_RICH'),
        sa.Column('requirement_text', sa.Text(), nullable=False),
        sa.Column('requirement_type', postgresql.ENUM('FUNCTIONAL', 'NON_FUNCTIONAL', 'USER_STORY', name='requirementtype', create_type=False), nullable=False, server_default='FUNCTIONAL'),
        sa.Column('project_context', sa.Text(), nullable=True),
        sa.Column('expected_issue_types', sa.JSON(), nullable=False),
        sa.Column('expected_severities', sa.JSON(), nullable=False),
        sa.Column('expected_sources', sa.JSON(), nullable=False),
        sa.Column('has_issue', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('ground_truth_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_evaluation_cases_dataset_id'), 'evaluation_cases', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_evaluation_cases_case_type'), 'evaluation_cases', ['case_type'], unique=False)
    op.create_index(op.f('ix_evaluation_cases_requirement_type'), 'evaluation_cases', ['requirement_type'], unique=False)

    # 4. Create evaluation_runs table
    op.create_table(
        'evaluation_runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('dataset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evaluation_datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('condition', postgresql.ENUM('LLM_ONLY', 'RAG_LLM', 'RAG_LLM_HUMAN', name='evaluationcondition', create_type=False), nullable=False, server_default='RAG_LLM'),
        sa.Column('model_name', sa.String(100), nullable=False, server_default='mock-deterministic-v1'),
        sa.Column('prompt_version', sa.String(100), nullable=False, server_default='REQUIREMENT_REVIEW_PROMPT_V1'),
        sa.Column('embedding_model', sa.String(100), nullable=True),
        sa.Column('retrieval_top_k', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('chunk_configuration', sa.JSON(), nullable=False),
        sa.Column('status', postgresql.ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', name='aijobstatus', create_type=False), nullable=False, server_default='QUEUED'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('configuration_metadata', sa.JSON(), nullable=True),
        sa.Column('aggregate_precision', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_recall', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_f1', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_precision_at_k', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_recall_at_k', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_mrr', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_grounding_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_insufficient_context_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_human_acceptance_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_human_rejection_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('aggregate_human_modification_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_retrieval_latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_generation_latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_total_latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('metrics_by_requirement_type', sa.JSON(), nullable=True),
        sa.Column('metrics_by_context_type', sa.JSON(), nullable=True),
    )
    op.create_index(op.f('ix_evaluation_runs_dataset_id'), 'evaluation_runs', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_evaluation_runs_condition'), 'evaluation_runs', ['condition'], unique=False)
    op.create_index(op.f('ix_evaluation_runs_status'), 'evaluation_runs', ['status'], unique=False)

    # 5. Create evaluation_case_results table
    op.create_table(
        'evaluation_case_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('evaluation_run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evaluation_runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('evaluation_cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('review_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('requirement_reviews.id', ondelete='SET NULL'), nullable=True),
        sa.Column('predicted_findings', sa.JSON(), nullable=False),
        sa.Column('predicted_issue_types', sa.JSON(), nullable=False),
        sa.Column('predicted_severities', sa.JSON(), nullable=False),
        sa.Column('grounded_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('insufficient_context_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('retrieved_chunk_ids', sa.JSON(), nullable=True),
        sa.Column('retrieval_scores', sa.JSON(), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('tp', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('fp', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('fn', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tn', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('retrieval_precision_at_k', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('retrieval_recall_at_k', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('mrr', sa.Float(), nullable=False, server_default='0.0'),
    )
    op.create_index(op.f('ix_evaluation_case_results_evaluation_run_id'), 'evaluation_case_results', ['evaluation_run_id'], unique=False)
    op.create_index(op.f('ix_evaluation_case_results_case_id'), 'evaluation_case_results', ['case_id'], unique=False)


def downgrade():
    op.drop_table('evaluation_case_results')
    op.drop_table('evaluation_runs')
    op.drop_table('evaluation_cases')
    op.drop_table('evaluation_datasets')
    op.execute('DROP TYPE IF EXISTS evaluationcasetype')
    op.execute('DROP TYPE IF EXISTS evaluationcondition')
