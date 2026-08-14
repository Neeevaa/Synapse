import math
from uuid import UUID
from typing import Optional
from sqlalchemy import select, delete, desc
from sqlalchemy.orm import Session, joinedload

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, KnowledgeRetrievalLog, HAS_PGVECTOR
from app.models.enums import KnowledgeSourceType


class KnowledgeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_document_by_source(
        self,
        company_id: UUID,
        project_id: UUID,
        source_type: KnowledgeSourceType,
        source_id: UUID,
        source_version: Optional[int] = None,
    ) -> Optional[KnowledgeDocument]:
        """
        Retrieves existing KnowledgeDocument with mandatory company_id & project_id filtering.
        """
        stmt = (
            select(KnowledgeDocument)
            .options(joinedload(KnowledgeDocument.chunks))
            .filter(
                KnowledgeDocument.company_id == company_id,
                KnowledgeDocument.project_id == project_id,
                KnowledgeDocument.source_type == source_type,
                KnowledgeDocument.source_id == source_id,
            )
        )
        if source_version is not None:
            stmt = stmt.filter(KnowledgeDocument.source_version == source_version)
        else:
            stmt = stmt.filter(KnowledgeDocument.source_version.is_(None))

        return self.db.execute(stmt).unique().scalar_one_or_none()

    def create_document(
        self,
        company_id: UUID,
        project_id: UUID,
        doc: KnowledgeDocument,
    ) -> KnowledgeDocument:
        doc.company_id = company_id
        doc.project_id = project_id
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def delete_document(
        self,
        company_id: UUID,
        project_id: UUID,
        document_id: UUID,
    ):
        doc = self.db.execute(
            select(KnowledgeDocument).filter(
                KnowledgeDocument.company_id == company_id,
                KnowledgeDocument.project_id == project_id,
                KnowledgeDocument.id == document_id,
            )
        ).unique().scalar_one_or_none()

        if doc:
            self.db.delete(doc)
            self.db.commit()

    def create_chunks(
        self,
        company_id: UUID,
        project_id: UUID,
        chunks: list[KnowledgeChunk],
    ):
        for c in chunks:
            c.company_id = company_id
            c.project_id = project_id
            self.db.add(c)
        self.db.commit()

    def search_similar_chunks(
        self,
        company_id: UUID,
        project_id: UUID,
        query_vector: list[float],
        top_k: int = 5,
        source_type: Optional[KnowledgeSourceType] = None,
        min_similarity: float = 0.0,
    ) -> list[tuple[KnowledgeChunk, KnowledgeDocument, float]]:
        """
        Executes vector similarity search with MANDATORY company_id and project_id filtering.
        """
        stmt = (
            select(KnowledgeChunk, KnowledgeDocument)
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .filter(
                KnowledgeChunk.company_id == company_id,
                KnowledgeChunk.project_id == project_id,
            )
        )

        if source_type:
            stmt = stmt.filter(KnowledgeChunk.source_type == source_type)

        results = self.db.execute(stmt).all()
        if not results:
            return []

        # Calculate Cosine Similarity for retrieved chunks
        scored_results: list[tuple[KnowledgeChunk, KnowledgeDocument, float]] = []

        def cosine_similarity(v1: list[float], v2: list[float]) -> float:
            dot = sum(a * b for a, b in zip(v1, v2))
            norm1 = math.sqrt(sum(a * a for a in v1)) or 1.0
            norm2 = math.sqrt(sum(b * b for b in v2)) or 1.0
            return dot / (norm1 * norm2)

        for chunk, doc in results:
            emb = chunk.embedding
            if isinstance(emb, list):
                sim = cosine_similarity(query_vector, emb)
            else:
                try:
                    # pgvector Object fallback
                    emb_list = [float(x) for x in emb]
                    sim = cosine_similarity(query_vector, emb_list)
                except Exception:
                    sim = 0.0

            if sim >= min_similarity:
                scored_results.append((chunk, doc, sim))

        # Sort descending by similarity score
        scored_results.sort(key=lambda x: x[2], reverse=True)
        return scored_results[:top_k]

    def create_retrieval_log(
        self,
        company_id: UUID,
        project_id: UUID,
        log: KnowledgeRetrievalLog,
    ) -> KnowledgeRetrievalLog:
        log.company_id = company_id
        log.project_id = project_id
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_retrieval_logs(
        self,
        company_id: UUID,
        project_id: UUID,
        limit: int = 50,
    ) -> list[KnowledgeRetrievalLog]:
        stmt = (
            select(KnowledgeRetrievalLog)
            .filter(
                KnowledgeRetrievalLog.company_id == company_id,
                KnowledgeRetrievalLog.project_id == project_id,
            )
            .order_by(desc(KnowledgeRetrievalLog.created_at))
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_indexing_summary(
        self,
        company_id: UUID,
        project_id: UUID,
    ) -> tuple[int, int]:
        from sqlalchemy import func
        doc_count = self.db.scalar(
            select(func.count(KnowledgeDocument.id))
            .filter(
                KnowledgeDocument.company_id == company_id,
                KnowledgeDocument.project_id == project_id,
            )
        ) or 0
        chunk_count = self.db.scalar(
            select(func.count(KnowledgeChunk.id))
            .filter(
                KnowledgeChunk.company_id == company_id,
                KnowledgeChunk.project_id == project_id,
            )
        ) or 0
        return doc_count, chunk_count
