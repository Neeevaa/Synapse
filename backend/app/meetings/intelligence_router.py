from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.meetings.intelligence_schemas import (
    MeetingAnalysisResponse,
    MeetingTaskSuggestionResponse,
    UpdateTaskSuggestionDecisionRequest,
    MeetingIntelligenceMetricsResponse,
)
from app.meetings.intelligence_service import MeetingIntelligenceService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post(
    "/{meeting_id}/analyze",
    response_model=APIResponse[MeetingAnalysisResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Run AI Meeting Intelligence on Transcript",
    description="Extracts summary, decisions, risks, action items, and task suggestions from meeting transcript using RAG.",
)
def create_and_execute_analysis(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingIntelligenceService(db)
    result = service.create_and_execute_analysis(project_id, meeting_id, current_user)
    return success_response(message="Meeting intelligence analysis created successfully.", data=result)


@router.get(
    "/{meeting_id}/analyses",
    response_model=APIResponse[list[MeetingAnalysisResponse]],
    status_code=status.HTTP_200_OK,
    summary="List analysis runs for a meeting",
    description="Retrieves historical versioned AI meeting analysis runs.",
)
def list_meeting_analyses(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingIntelligenceService(db)
    result = service.list_meeting_analyses(project_id, meeting_id, current_user)
    return success_response(message="Meeting analyses retrieved successfully.", data=result)


@router.get(
    "/{meeting_id}/analyses/{analysis_id}",
    response_model=APIResponse[MeetingAnalysisResponse],
    status_code=status.HTTP_200_OK,
    summary="Get analysis detail",
    description="Retrieves meeting analysis detail along with extracted task suggestions.",
)
def get_analysis_detail(
    project_id: UUID,
    meeting_id: UUID,
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingIntelligenceService(db)
    result = service.get_analysis_detail(project_id, meeting_id, analysis_id, current_user)
    return success_response(message="Meeting analysis detail retrieved successfully.", data=result)


@router.patch(
    "/{meeting_id}/analyses/{analysis_id}/suggestions/{suggestion_id}",
    response_model=APIResponse[MeetingTaskSuggestionResponse],
    status_code=status.HTTP_200_OK,
    summary="Submit human decision for task suggestion",
    description="Accepts, edits, or rejects an AI task suggestion. Only ACCEPTED or MODIFIED suggestions convert into real project tasks.",
)
def update_task_suggestion_decision(
    project_id: UUID,
    meeting_id: UUID,
    analysis_id: UUID,
    suggestion_id: UUID,
    request: UpdateTaskSuggestionDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingIntelligenceService(db)
    result = service.update_task_suggestion_decision(
        project_id, meeting_id, analysis_id, suggestion_id, request, current_user
    )
    return success_response(message="Task suggestion decision updated successfully.", data=result)


@router.get(
    "/intelligence/metrics",
    response_model=APIResponse[MeetingIntelligenceMetricsResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Meeting Intelligence research metrics",
    description="Retrieves research evaluation metrics for human acceptance rate, latency, and precision.",
)
def get_meeting_intelligence_metrics(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingIntelligenceService(db)
    result = service.get_meeting_intelligence_metrics(project_id, current_user)
    return success_response(message="Meeting intelligence metrics retrieved successfully.", data=result)
