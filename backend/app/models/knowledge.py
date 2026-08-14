from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, Float, ForeignKey, DateTime, Enum, JSON, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

from sqlalchemy.types import TypeDecorator

# Pinned DB Schema Vector Dimension (1536)
PINNED_VECTOR_DIMENSION = 1536

class CompatibleVectorType(TypeDecorator):
    """
    Seamless vector column type rendering ARRAY(Float) for PostgreSQL and JSON for SQLite.
    """
    impl = ARRAY(Float)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "sqlite":
            return dialect.type_descriptor(JSON)
        return dialect.type_descriptor(ARRAY(Float))

# Vector column definition for PostgreSQL + SQLite test compatibility
VectorColumnType = CompatibleVectorType()


from app.models.base import Base
from app.models.enums import KnowledgeSourceType


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type = Column(
        Enum(KnowledgeSourceType),
        nullable=False,
        index=True,
    )
    source_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_version = Column(Integer, nullable=True)
    source_key = Column(String(100), nullable=True)

    title = Column(String(255), nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hash
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    project = relationship("Project", backref="knowledge_documents")
    company = relationship("Company", backref="knowledge_documents")
    chunks = relationship(
        "KnowledgeChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type = Column(
        Enum(KnowledgeSourceType),
        nullable=False,
        index=True,
    )
    source_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source_version = Column(Integer, nullable=True)

    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)

    # Pinned schema vector column
    embedding = Column(VectorColumnType, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("KnowledgeDocument", back_populates="chunks")
    project = relationship("Project", backref="knowledge_chunks")
    company = relationship("Company", backref="knowledge_chunks")


class KnowledgeRetrievalLog(Base):
    __tablename__ = "knowledge_retrieval_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    query = Column(Text, nullable=False)
    top_k = Column(Integer, nullable=False, default=5)
    retrieved_chunk_ids = Column(JSON, nullable=False)
    similarity_scores = Column(JSON, nullable=False)
    retrieval_latency_ms = Column(Float, nullable=False)
    embedding_model = Column(String(100), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", backref="retrieval_logs")
    company = relationship("Company", backref="retrieval_logs")
    user = relationship("User", foreign_keys=[user_id])
