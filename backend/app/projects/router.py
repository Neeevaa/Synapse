from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.projects.schemas import (
    CreateProjectRequest,
    UpdateProjectRequest,
    ProjectResponse,
    ProjectDetailResponse,
    ProjectListResponse,
)
from app.projects.service import ProjectService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user, require_admin
from app.models.user import User

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[ProjectListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all projects for the current user's company",
)
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectService(db)
    result = service.list_projects(current_user)
    return success_response(
        message="Projects retrieved successfully.",
        data=result,
    )


@router.post(
    "",
    response_model=APIResponse[ProjectResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Requires OWNER or ADMIN role.",
)
def create_project(
    data: CreateProjectRequest,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    service = ProjectService(db)
    result = service.create_project(data, current_user)
    return success_response(
        message="Project created successfully.",
        data=result,
    )


@router.get(
    "/{project_id}",
    response_model=APIResponse[ProjectDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Get a single project by ID with statistics",
)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectService(db)
    result = service.get_project_detail(project_id, current_user)
    return success_response(
        message="Project retrieved successfully.",
        data=result,
    )


@router.put(
    "/{project_id}",
    response_model=APIResponse[ProjectDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="Update project details",
)
def update_project(
    project_id: UUID,
    data: UpdateProjectRequest,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    service = ProjectService(db)
    result = service.update_project(project_id, data, current_user)
    return success_response(
        message="Project updated successfully.",
        data=result,
    )


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a project",
)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    service = ProjectService(db)
    service.delete_project(project_id, current_user)
    return success_response(message="Project deleted successfully.")
