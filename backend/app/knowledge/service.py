import time
from uuid import UUID
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.requirement import Requirement, RequirementVersion
from app.models.meeting import Meeting, MeetingActionItem
from app.models.task import Task
from app.models.sprint import Sprint
from app.models.enums import KnowledgeSourceType
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, KnowledgeRetrievalLog
from app.knowledge.schemas import (
    KnowledgeSearchRequest,
    KnowledgeSearchResult,
    KnowledgeSearchResponse,
    RAGContextRequest,
    RAGContextResponse,
    KnowledgeRetrievalLogResponse,
    IndexingStatusResponse,
)
from app.knowledge.provider import get_embedding_provider
from app.knowledge.normalizer import ArtifactNormalizer, NormalizedArtifact
from app.knowledge.chunker import TextChunker, estimate_token_count
from app.knowledge.repository import KnowledgeRepository
from app.permissions.dependencies import check_project_role_or_company_admin
from app.core.config import settings


class KnowledgeService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = KnowledgeRepository(db)
        self.provider = get_embedding_provider()
        self.chunker = TextChunker(max_tokens=512, overlap_tokens=64)

    def _index_normalized_artifact(
        self,
        company_id: UUID,
        project_id: UUID,
        art: NormalizedArtifact,
    ) -> bool:
        """
        Indexes a single normalized artifact.
        Returns True if newly indexed/re-indexed, False if skipped due to content_hash match.
        """
        existing = self.repo.get_document_by_source(
            company_id=company_id,
            project_id=project_id,
            source_type=art.source_type,
            source_id=art.source_id,
            source_version=art.source_version,
        )

        if existing and existing.content_hash == art.content_hash:
            return False  # Skipped due to content_hash match

        # Delete stale document if content changed
        if existing:
            self.repo.delete_document(company_id, project_id, existing.id)

        # Create new document record
        meta = dict(art.metadata)
        meta["deep_link_url"] = art.deep_link_url
        doc = KnowledgeDocument(
            project_id=project_id,
            company_id=company_id,
            source_type=art.source_type,
            source_id=art.source_id,
            source_version=art.source_version,
            source_key=art.source_key,
            title=art.title,
            content_hash=art.content_hash,
            content=art.content,
            metadata_json=meta,
        )
        created_doc = self.repo.create_document(company_id, project_id, doc)

        # Chunk text
        chunks = self.chunker.chunk_text(art.content)
        if not chunks:
            return True

        chunk_texts = [c[0] for c in chunks]
        embeddings = self.provider.embed_texts(chunk_texts)

        db_chunks = []
        for idx, ((chunk_text, token_cnt), emb) in enumerate(zip(chunks, embeddings)):
            chunk_obj = KnowledgeChunk(
                document_id=created_doc.id,
                project_id=project_id,
                company_id=company_id,
                source_type=art.source_type,
                source_id=art.source_id,
                source_version=art.source_version,
                chunk_index=idx,
                content=chunk_text,
                token_count=token_cnt,
                embedding=emb,
            )
            db_chunks.append(chunk_obj)

        self.repo.create_chunks(company_id, project_id, db_chunks)
        return True

    def index_project_artifacts(
        self,
        project_id: UUID,
        current_user: User,
    ) -> IndexingStatusResponse:
        """
        Indexes or re-indexes all project artifacts (Requirements, Versions, Meetings, Action Items, Tasks, Sprints).
        Skips documents whose SHA-256 content_hash is unchanged.
        """
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        indexed_count = 0
        skipped_count = 0
        chunks_count = 0

        # 1. Index Requirements & RequirementVersions
        requirements = self.db.execute(
            select(Requirement)
            .options(joinedload(Requirement.versions))
            .filter(Requirement.project_id == project_id)
        ).scalars().unique().all()

        for req in requirements:
            norm_req = ArtifactNormalizer.normalize_requirement(req)
            if self._index_normalized_artifact(company_id, project_id, norm_req):
                indexed_count += 1
            else:
                skipped_count += 1

            for ver in req.versions:
                norm_ver = ArtifactNormalizer.normalize_requirement_version(ver, req.requirement_key, project_id, company_id)
                if self._index_normalized_artifact(company_id, project_id, norm_ver):
                    indexed_count += 1
                else:
                    skipped_count += 1

        # 2. Index Meetings (Notes & Transcripts & Action Items)
        meetings = self.db.execute(
            select(Meeting)
            .options(
                joinedload(Meeting.organizer),
                joinedload(Meeting.action_items).joinedload(MeetingActionItem.assignee),
                joinedload(Meeting.action_items).joinedload(MeetingActionItem.requirement),
                joinedload(Meeting.action_items).joinedload(MeetingActionItem.task),
            )
            .filter(Meeting.project_id == project_id)
        ).scalars().unique().all()

        for m in meetings:
            # Notes
            norm_notes = ArtifactNormalizer.normalize_meeting_notes(m)
            if self._index_normalized_artifact(company_id, project_id, norm_notes):
                indexed_count += 1
            else:
                skipped_count += 1

            # Transcript
            if m.transcript and m.transcript.strip():
                norm_trans = ArtifactNormalizer.normalize_meeting_transcript(m)
                if self._index_normalized_artifact(company_id, project_id, norm_trans):
                    indexed_count += 1
                else:
                    skipped_count += 1

            # Action Items
            for ai in m.action_items:
                norm_ai = ArtifactNormalizer.normalize_meeting_action_item(ai, project_id, company_id)
                if self._index_normalized_artifact(company_id, project_id, norm_ai):
                    indexed_count += 1
                else:
                    skipped_count += 1

        # 3. Index Tasks
        tasks = self.db.execute(
            select(Task).filter(Task.project_id == project_id)
        ).scalars().all()

        for t in tasks:
            norm_task = ArtifactNormalizer.normalize_task(t, company_id)
            if self._index_normalized_artifact(company_id, project_id, norm_task):
                indexed_count += 1
            else:
                skipped_count += 1

        # 4. Index Sprints
        sprints = self.db.execute(
            select(Sprint).filter(Sprint.project_id == project_id)
        ).scalars().all()

        for s in sprints:
            norm_sprint = ArtifactNormalizer.normalize_sprint(s, company_id)
            if self._index_normalized_artifact(company_id, project_id, norm_sprint):
                indexed_count += 1
            else:
                skipped_count += 1

        doc_total, chunk_total = self.repo.get_indexing_summary(company_id, project_id)

        return IndexingStatusResponse(
            project_id=project_id,
            total_documents_indexed=doc_total,
            total_chunks_created=chunk_total,
            documents_skipped_hash_match=skipped_count,
            embedding_model=self.provider.get_model_name(),
            embedding_dimension=self.provider.get_dimension(),
        )

    def search_knowledge(
        self,
        project_id: UUID,
        request: KnowledgeSearchRequest,
        current_user: User,
    ) -> KnowledgeSearchResponse:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        company_id = project.company_id

        start_time = time.time()

        # Embed query text
        query_vectors = self.provider.embed_texts([request.query])
        query_vector = query_vectors[0]

        # Vector similarity search with mandatory tenant filters
        scored_chunks = self.repo.search_similar_chunks(
            company_id=company_id,
            project_id=project_id,
            query_vector=query_vector,
            top_k=request.top_k,
            source_type=request.source_type,
            min_similarity=request.min_similarity,
        )

        latency_ms = round((time.time() - start_time) * 1000.0, 2)

        results: list[KnowledgeSearchResult] = []
        retrieved_chunk_ids = []
        similarity_scores = []

        for chunk, doc, sim in scored_chunks:
            meta = doc.metadata_json or {}
            deep_link = meta.get("deep_link_url") or f"/projects/{project_id}"
            res_item = KnowledgeSearchResult(
                chunk_id=chunk.id,
                document_id=doc.id,
                project_id=project_id,
                company_id=company_id,
                source_type=chunk.source_type,
                source_id=chunk.source_id,
                source_version=chunk.source_version,
                source_key=doc.source_key,
                title=doc.title,
                content=chunk.content,
                similarity_score=round(sim, 4),
                deep_link_url=deep_link,
            )
            results.append(res_item)
            retrieved_chunk_ids.append(str(chunk.id))
            similarity_scores.append(round(sim, 4))

        # Record Retrieval Telemetry Log
        telemetry_log = KnowledgeRetrievalLog(
            project_id=project_id,
            company_id=company_id,
            user_id=current_user.id,
            query=request.query.strip(),
            top_k=request.top_k,
            retrieved_chunk_ids=retrieved_chunk_ids,
            similarity_scores=similarity_scores,
            retrieval_latency_ms=latency_ms,
            embedding_model=self.provider.get_model_name(),
        )
        self.repo.create_retrieval_log(company_id, project_id, telemetry_log)

        return KnowledgeSearchResponse(
            results=results,
            total_results=len(results),
            query_latency_ms=latency_ms,
            embedding_model=self.provider.get_model_name(),
        )

    def construct_rag_context(
        self,
        project_id: UUID,
        request: RAGContextRequest,
        current_user: User,
    ) -> RAGContextResponse:
        """
        Constructs formatted LLM prompt context window with explicit [SOURCE: ...] headers.
        STRICTLY NO LLM CALLS ARE EXECUTED.
        """
        search_req = KnowledgeSearchRequest(
            query=request.query,
            top_k=request.top_k,
        )
        search_res = self.search_knowledge(project_id, search_req, current_user)

        context_blocks = []
        for src in search_res.results:
            version_str = f" | VERSION: {src.source_version}" if src.source_version else ""
            key_str = f" | {src.source_key}" if src.source_key else ""
            header = f"[SOURCE: {src.source_type.value}{key_str}{version_str}]"

            block = f"{header}\n{src.content}"
            context_blocks.append(block)

        formatted_context = "\n\n".join(context_blocks)
        total_tokens = estimate_token_count(formatted_context)

        return RAGContextResponse(
            project_id=project_id,
            query=request.query,
            formatted_context=formatted_context,
            sources=search_res.results,
            total_tokens=total_tokens,
        )

    def get_telemetry_logs(
        self,
        project_id: UUID,
        current_user: User,
        limit: int = 50,
    ) -> list[KnowledgeRetrievalLogResponse]:
        project = check_project_role_or_company_admin(self.db, current_user, project_id)
        logs = self.repo.get_retrieval_logs(project.company_id, project_id, limit=limit)
        return [KnowledgeRetrievalLogResponse.model_validate(log) for log in logs]
