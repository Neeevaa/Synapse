from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.sprints.schemas import (
    CreateSprintRequest,
    UpdateSprintRequest,
    SprintResponse,
    SprintListResponse,
)
from app.sprints.service import SprintService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/{project_id}/sprints",
    response_model=APIResponse[SprintListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all sprints for a project",
)
def list_sprints(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SprintService(db)
    result = service.list_sprints(project_id, current_user)
    return success_response(
        message="Sprints retrieved successfully.",
        data=result,
    )


@router.get(
    "/{project_id}/sprints/active",
    response_model=APIResponse[SprintResponse],
    status_code=status.HTTP_200_OK,
    summary="Get active sprint for a project",
)
def get_active_sprint(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SprintService(db)
    result = service.get_active_sprint(project_id, current_user)
    return success_response(
        message="Active sprint retrieved successfully.",
        data=result,
    )


@router.post(
    "/{project_id}/sprints",
    response_model=APIResponse[SprintResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sprint",
)
def create_sprint(
    project_id: UUID,
    data: CreateSprintRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SprintService(db)
    result = service.create_sprint(project_id, data, current_user)
    return success_response(
        message="Sprint created successfully.",
        data=result,
    )


@router.put(
    "/sprints/{sprint_id}",
    response_model=APIResponse[SprintResponse],
    status_code=status.HTTP_200_OK,
    summary="Update sprint details (name, goal, status, dates)",
)
def update_sprint(
    sprint_id: UUID,
    data: UpdateSprintRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = SprintService(db)
    result = service.update_sprint(sprint_id, data, current_user)
    return success_response(
        message="Sprint updated successfully.",
        data=result,
    )
