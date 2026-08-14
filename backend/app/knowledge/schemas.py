from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import KnowledgeSourceType


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query string")
    top_k: int = Field(default=5, ge=1, le=50, description="Top K similar chunks")
    source_type: Optional[KnowledgeSourceType] = Field(default=None, description="Optional filter by source type")
    min_similarity: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")


class KnowledgeSearchResult(BaseModel):
    chunk_id: UUID
    document_id: UUID
    project_id: UUID
    company_id: UUID
    source_type: KnowledgeSourceType
    source_id: UUID
    source_version: Optional[int] = None
    source_key: Optional[str] = None
    title: str
    content: str
    similarity_score: float
    deep_link_url: str

    model_config = ConfigDict(from_attributes=True)


class KnowledgeSearchResponse(BaseModel):
    results: list[KnowledgeSearchResult]
    total_results: int
    query_latency_ms: float
    embedding_model: str


class RAGContextRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Query string to construct RAG context for")
    top_k: int = Field(default=5, ge=1, le=20, description="Top K chunks")
    max_context_tokens: int = Field(default=2000, ge=100, le=8000)


class RAGContextResponse(BaseModel):
    project_id: UUID
    query: str
    formatted_context: str
    sources: list[KnowledgeSearchResult]
    total_tokens: int


class KnowledgeRetrievalLogResponse(BaseModel):
    id: UUID
    project_id: UUID
    company_id: UUID
    user_id: UUID
    query: str
    top_k: int
    retrieved_chunk_ids: list[str]
    similarity_scores: list[float]
    retrieval_latency_ms: float
    embedding_model: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IndexingStatusResponse(BaseModel):
    project_id: UUID
    total_documents_indexed: int
    total_chunks_created: int
    documents_skipped_hash_match: int
    embedding_model: str
    embedding_dimension: int
