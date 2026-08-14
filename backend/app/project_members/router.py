from uuid import UUID
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.project_members.schemas import (
    AddProjectMemberRequest,
    InviteProjectMemberRequest,
    InvitationResponse,
    ValidateInvitationResponse,
    AcceptInvitationRequest,
    UpdateProjectMemberRoleRequest,
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
    "/{project_id}/members/invite",
    response_model=APIResponse[InvitationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Send a secure invitation to join a project",
)
def invite_project_member(
    project_id: UUID,
    data: InviteProjectMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    result = service.invite_member(project_id, data, current_user)
    return success_response(
        message="Project invitation created and email dispatched.",
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


@router.put(
    "/{project_id}/members/{user_id}",
    response_model=APIResponse[ProjectMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="Update a project member's role and specialization",
)
def update_project_member_role(
    project_id: UUID,
    user_id: UUID,
    data: UpdateProjectMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    result = service.update_member_role(project_id, user_id, data, current_user)
    return success_response(
        message="Member role updated successfully.",
        data=result,
    )


@router.delete(
    "/{project_id}/invitations/{invitation_id}",
    status_code=status.HTTP_200_OK,
    summary="Revoke a pending project invitation",
)
@router.post(
    "/{project_id}/members/invitations/{invitation_id}/revoke",
    status_code=status.HTTP_200_OK,
    summary="Revoke a pending project invitation (alternate alias)",
)
@router.delete(
    "/{project_id}/members/invitations/{invitation_id}",
    status_code=status.HTTP_200_OK,
    summary="Revoke a pending project invitation (alternate alias)",
)
def revoke_project_invitation(
    project_id: UUID,
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    service.revoke_invitation(project_id, invitation_id, current_user)
    return success_response(
        message="Invitation revoked successfully.",
        data=None,
    )


@router.get(
    "/invitations/validate",
    response_model=APIResponse[ValidateInvitationResponse],
    status_code=status.HTTP_200_OK,
    summary="Validate an invitation token for the join flow",
)
def validate_invitation_token(
    token: str = Query(..., min_length=1, description="Raw invitation token string"),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    result = service.validate_invitation(token)
    return success_response(
        message="Invitation token details validated.",
        data=result,
    )


@router.post(
    "/invitations/accept",
    response_model=APIResponse[ProjectMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="Accept a project invitation token for authenticated user",
)
def accept_invitation_token(
    data: AcceptInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ProjectMemberService(db)
    result = service.accept_invitation(data.token, current_user)
    return success_response(
        message="Invitation accepted and project membership granted.",
        data=result,
    )
