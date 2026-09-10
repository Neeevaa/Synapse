from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response
from app.notifications.schemas import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkAllReadRequest,
)
from app.notifications.service import NotificationService

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[NotificationListResponse],
    status_code=status.HTTP_200_OK,
    summary="Get user notifications grouped by project",
)
def get_user_notifications(
    project_id: Optional[UUID] = Query(None, description="Filter by project ID"),
    is_read: Optional[bool] = Query(None, description="Filter by read/unread state"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    result = service.get_user_notifications(
        current_user=current_user,
        project_id=project_id,
        is_read=is_read,
        page=page,
        limit=limit,
    )
    return success_response(
        message="Notifications retrieved successfully.",
        data=result,
    )


@router.get(
    "/unread-count",
    response_model=APIResponse[UnreadCountResponse],
    status_code=status.HTTP_200_OK,
    summary="Get lightweight unread notifications count for header badge",
)
def get_unread_count(
    project_id: Optional[UUID] = Query(None, description="Filter by project ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    count = service.get_unread_count(
        current_user=current_user,
        project_id=project_id,
    )
    return success_response(
        message="Unread count retrieved.",
        data=UnreadCountResponse(unread_count=count),
    )


@router.patch(
    "/{notification_id}/read",
    response_model=APIResponse[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="Mark single notification as read",
)
def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    updated = service.mark_notification_as_read(
        notification_id=notification_id,
        current_user=current_user,
    )
    return success_response(
        message="Notification marked as read.",
        data=updated,
    )


@router.post(
    "/mark-all-read",
    response_model=APIResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Mark all user notifications as read",
)
def mark_all_notifications_read(
    request: Optional[MarkAllReadRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    p_id = request.project_id if request else None
    count = service.mark_all_as_read(
        current_user=current_user,
        project_id=p_id,
    )
    return success_response(
        message=f"Marked {count} notifications as read.",
        data={"marked_read_count": count},
    )
