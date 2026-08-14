from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.enums import (
    RequirementType,
    RequirementStatus,
    RequirementPriority,
)
from app.requirements.schemas import (
    RequirementCreate,
    RequirementUpdate,
    RequirementStatusUpdate,
    RequirementResponse,
    RequirementListResponse,
)
from app.requirements.service import RequirementService
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response

router = APIRouter(prefix="/projects", tags=["Requirements"])


@router.post(
    "/{project_id}/requirements",
    response_model=APIResponse[RequirementResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project requirement",
)
def create_requirement(
    project_id: UUID,
    data: RequirementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementService(db)
    result = service.create_requirement(project_id, data, current_user)
    return success_response(
        message="Requirement created successfully.",
        data=result,
    )


@router.get(
    "/{project_id}/requirements",
    response_model=APIResponse[RequirementListResponse],
    status_code=status.HTTP_200_OK,
    summary="List project requirements with filtering and pagination",
)
def list_requirements(
    project_id: UUID,
    requirement_type: Optional[RequirementType] = Query(None, description="Filter by requirement type"),
    priority: Optional[RequirementPriority] = Query(None, description="Filter by priority"),
    status_val: Optional[RequirementStatus] = Query(None, alias="status", description="Filter by status"),
    created_by: Optional[UUID] = Query(None, description="Filter by creator user ID"),
    keyword: Optional[str] = Query(None, description="Search keyword in title, description, or key"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementService(db)
    result = service.list_requirements(
        project_id=project_id,
        current_user=current_user,
        requirement_type=requirement_type,
        priority=priority,
        status=status_val,
        created_by=created_by,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return success_response(
        message="Requirements retrieved successfully.",
        data=result,
    )


@router.get(
    "/{project_id}/requirements/{requirement_id}",
    response_model=APIResponse[RequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="Get requirement detail with version history",
)
def get_requirement(
    project_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementService(db)
    result = service.get_requirement(project_id, requirement_id, current_user)
    return success_response(
        message="Requirement retrieved successfully.",
        data=result,
    )


@router.put(
    "/{project_id}/requirements/{requirement_id}",
    response_model=APIResponse[RequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="Update requirement content (creates new version)",
)
def update_requirement(
    project_id: UUID,
    requirement_id: UUID,
    data: RequirementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementService(db)
    result = service.update_requirement(project_id, requirement_id, data, current_user)
    return success_response(
        message="Requirement updated successfully.",
        data=result,
    )


@router.patch(
    "/{project_id}/requirements/{requirement_id}/status",
    response_model=APIResponse[RequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="Transition requirement status",
)
def update_requirement_status(
    project_id: UUID,
    requirement_id: UUID,
    data: RequirementStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementService(db)
    result = service.update_requirement_status(project_id, requirement_id, data, current_user)
    return success_response(
        message=f"Requirement status updated to {data.status.value}.",
        data=result,
    )


@router.delete(
    "/{project_id}/requirements/{requirement_id}",
    response_model=APIResponse[RequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="Archive a requirement",
)
def archive_requirement(
    project_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementService(db)
    result = service.archive_requirement(project_id, requirement_id, current_user)
    return success_response(
        message="Requirement archived successfully.",
        data=result,
    )
