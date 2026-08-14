"""add_knowledge_base_pgvector_tables

Revision ID: 5c6d7e8f9a0b
Revises: 4b5c6d7e8f9a
Create Date: 2026-08-13 01:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

# revision identifiers, used by Alembic.
revision = '5c6d7e8f9a0b'
down_revision = '4b5c6d7e8f9a'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()

    # 1. Check pg_available_extensions safely without causing transaction abort
    has_vector_ext = False
    try:
        count = connection.scalar(sa.text("SELECT count(*) FROM pg_available_extensions WHERE name = 'vector';")) or 0
        if count > 0:
            connection.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector;"))
            has_vector_ext = True
    except Exception:
        has_vector_ext = False

    # 2. Create ENUM type safely
    knowledge_source_type_enum = postgresql.ENUM(
        'REQUIREMENT', 'REQUIREMENT_VERSION', 'MEETING_NOTE', 'MEETING_TRANSCRIPT',
        'MEETING_ACTION_ITEM', 'TASK', 'TASK_COMMENT', 'SPRINT', 'DOCUMENTATION',
        name='knowledgesourcetype'
    )
    knowledge_source_type_enum.create(op.get_bind(), checkfirst=True)

    # 3. Create knowledge_documents table
    op.create_table(
        'knowledge_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', postgresql.ENUM('REQUIREMENT', 'REQUIREMENT_VERSION', 'MEETING_NOTE', 'MEETING_TRANSCRIPT', 'MEETING_ACTION_ITEM', 'TASK', 'TASK_COMMENT', 'SPRINT', 'DOCUMENTATION', name='knowledgesourcetype', create_type=False), nullable=False),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_version', sa.Integer(), nullable=True),
        sa.Column('source_key', sa.String(100), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content_hash', sa.String(64), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_knowledge_documents_project_id'), 'knowledge_documents', ['project_id'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_company_id'), 'knowledge_documents', ['company_id'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_source_type'), 'knowledge_documents', ['source_type'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_source_id'), 'knowledge_documents', ['source_id'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_content_hash'), 'knowledge_documents', ['content_hash'], unique=False)

    # Determine vector column type
    vector_col_type = Vector(1536) if (HAS_PGVECTOR and has_vector_ext) else postgresql.ARRAY(sa.Float)

    # 4. Create knowledge_chunks table (with pinned Vector(1536) or ARRAY fallback)
    op.create_table(
        'knowledge_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', postgresql.ENUM('REQUIREMENT', 'REQUIREMENT_VERSION', 'MEETING_NOTE', 'MEETING_TRANSCRIPT', 'MEETING_ACTION_ITEM', 'TASK', 'TASK_COMMENT', 'SPRINT', 'DOCUMENTATION', name='knowledgesourcetype', create_type=False), nullable=False),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_version', sa.Integer(), nullable=True),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('embedding', vector_col_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_knowledge_chunks_document_id'), 'knowledge_chunks', ['document_id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_project_id'), 'knowledge_chunks', ['project_id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_company_id'), 'knowledge_chunks', ['company_id'], unique=False)

    # Create HNSW vector index if vector extension is active
    if has_vector_ext:
        try:
            op.create_index(
                'idx_knowledge_chunks_embedding',
                'knowledge_chunks',
                ['embedding'],
                postgresql_using='hnsw',
                postgresql_with={'m': 16, 'ef_construction': 64},
                postgresql_ops={'embedding': 'vector_cosine_ops'}
            )
        except Exception:
            pass

    # 5. Create knowledge_retrieval_logs table
    op.create_table(
        'knowledge_retrieval_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('top_k', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('retrieved_chunk_ids', sa.JSON(), nullable=False),
        sa.Column('similarity_scores', sa.JSON(), nullable=False),
        sa.Column('retrieval_latency_ms', sa.Float(), nullable=False),
        sa.Column('embedding_model', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_knowledge_retrieval_logs_project_id'), 'knowledge_retrieval_logs', ['project_id'], unique=False)
    op.create_index(op.f('ix_knowledge_retrieval_logs_company_id'), 'knowledge_retrieval_logs', ['company_id'], unique=False)


def downgrade():
    op.drop_table('knowledge_retrieval_logs')
    try:
        op.drop_index('idx_knowledge_chunks_embedding', table_name='knowledge_chunks')
    except Exception:
        pass
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    op.execute('DROP TYPE IF EXISTS knowledgesourcetype')
