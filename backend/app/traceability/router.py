from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.traceability.schemas import (
    RequirementTraceabilityResponse,
    MeetingTraceabilityResponse,
    TaskTraceabilityResponse,
    ProjectTraceabilityGraphResponse,
)
from app.traceability.service import TraceabilityService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/requirements/{requirement_id}",
    response_model=APIResponse[RequirementTraceabilityResponse],
    status_code=status.HTTP_200_OK,
    summary="Get related artifacts for a requirement",
    description="Retrieves linked meetings, action items, tasks, and sprints for a given requirement.",
)
def get_requirement_traceability(
    project_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TraceabilityService(db)
    result = service.get_requirement_traceability(project_id, requirement_id, current_user)
    return success_response(message="Requirement traceability context retrieved successfully.", data=result)


@router.get(
    "/meetings/{meeting_id}",
    response_model=APIResponse[MeetingTraceabilityResponse],
    status_code=status.HTTP_200_OK,
    summary="Get related artifacts for a meeting",
    description="Retrieves linked action items, requirements, and tasks for a given meeting.",
)
def get_meeting_traceability(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TraceabilityService(db)
    result = service.get_meeting_traceability(project_id, meeting_id, current_user)
    return success_response(message="Meeting traceability context retrieved successfully.", data=result)


@router.get(
    "/tasks/{task_id}",
    response_model=APIResponse[TaskTraceabilityResponse],
    status_code=status.HTTP_200_OK,
    summary="Get related artifacts for a task",
    description="Retrieves linked requirement, sprint, meetings, and action items for a given task.",
)
def get_task_traceability(
    project_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TraceabilityService(db)
    result = service.get_task_traceability(project_id, task_id, current_user)
    return success_response(message="Task traceability context retrieved successfully.", data=result)


@router.get(
    "/graph",
    response_model=APIResponse[ProjectTraceabilityGraphResponse],
    status_code=status.HTTP_200_OK,
    summary="Get complete project traceability graph",
    description="Retrieves the project-wide matrix connecting requirements, meetings, action items, and tasks.",
)
def get_project_traceability_graph(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TraceabilityService(db)
    result = service.get_project_traceability_graph(project_id, current_user)
    return success_response(message="Project traceability graph retrieved successfully.", data=result)
