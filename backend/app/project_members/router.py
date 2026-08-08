from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.project_members.schemas import (
    AddProjectMemberRequest,
    ProjectMemberResponse,
    ProjectMemberListResponse,
)
from app.project_members.service import ProjectMemberService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/{project_id}/members",
    response_model=APIResponse[ProjectMemberListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all members in a project",
)
def list_project_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    result = service.list_members(project_id, current_user)
    return success_response(
        message="Project members retrieved successfully.",
        data=result,
    )


@router.post(
    "/{project_id}/members",
    response_model=APIResponse[ProjectMemberResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add or invite a team member to a project",
)
def add_project_member(
    project_id: UUID,
    data: AddProjectMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    result = service.add_member_by_email(project_id, data, current_user)
    
    msg = (
        "Member added to project successfully."
        if result.outcome == "added"
        else "Invitation sent. Pending registration."
    )
    
    return success_response(
        message=msg,
        data=result,
    )


@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a member from a project",
)
def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    service.remove_member(project_id, user_id, current_user)
    return success_response(
        message="Member removed from project successfully.",
        data=None,
    )
