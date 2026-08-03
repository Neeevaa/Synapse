from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.task_comments.schemas import (
    CreateTaskCommentRequest,
    TaskCommentResponse,
    TaskCommentListResponse,
)
from app.task_comments.service import TaskCommentService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/tasks/{task_id}/comments",
    response_model=APIResponse[TaskCommentListResponse],
    status_code=status.HTTP_200_OK,
    summary="List all comments for a task",
)
def list_task_comments(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskCommentService(db)
    result = service.list_comments(task_id, current_user)
    return success_response(
        message="Task comments retrieved successfully.",
        data=result,
    )


@router.post(
    "/tasks/{task_id}/comments",
    response_model=APIResponse[TaskCommentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Post a new comment on a task",
)
def create_task_comment(
    task_id: UUID,
    data: CreateTaskCommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TaskCommentService(db)
    result = service.create_comment(task_id, data, current_user)
    return success_response(
        message="Task comment posted successfully.",
        data=result,
    )
