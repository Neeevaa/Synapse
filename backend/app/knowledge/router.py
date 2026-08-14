from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.knowledge.schemas import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    RAGContextRequest,
    RAGContextResponse,
    KnowledgeRetrievalLogResponse,
    IndexingStatusResponse,
)
from app.knowledge.service import KnowledgeService
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response

router = APIRouter(prefix="/projects", tags=["Knowledge Base & RAG Context"])


@router.post(
    "/{project_id}/knowledge/index",
    response_model=APIResponse[IndexingStatusResponse],
    status_code=status.HTTP_200_OK,
    summary="Index or re-index project artifacts into vector store",
)
def index_project_artifacts(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = KnowledgeService(db)
    result = service.index_project_artifacts(project_id, current_user)
    return success_response(message="Project knowledge base indexed successfully.", data=result)


@router.post(
    "/{project_id}/knowledge/search",
    response_model=APIResponse[KnowledgeSearchResponse],
    status_code=status.HTTP_200_OK,
    summary="Perform vector similarity search over project knowledge base",
)
def search_knowledge(
    project_id: UUID,
    request: KnowledgeSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = KnowledgeService(db)
    result = service.search_knowledge(project_id, request, current_user)
    return success_response(message="Vector similarity search completed.", data=result)


@router.post(
    "/{project_id}/knowledge/rag-context",
    response_model=APIResponse[RAGContextResponse],
    status_code=status.HTTP_200_OK,
    summary="Construct formatted RAG prompt context with [SOURCE: ...] headers (No LLM calls)",
)
def construct_rag_context(
    project_id: UUID,
    request: RAGContextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = KnowledgeService(db)
    result = service.construct_rag_context(project_id, request, current_user)
    return success_response(message="RAG prompt context constructed.", data=result)


@router.get(
    "/{project_id}/knowledge/telemetry",
    response_model=APIResponse[list[KnowledgeRetrievalLogResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get retrieval telemetry logs",
)
def get_retrieval_telemetry(
    project_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = KnowledgeService(db)
    result = service.get_telemetry_logs(project_id, current_user, limit=limit)
    return success_response(message="Retrieval telemetry logs retrieved.", data=result)
