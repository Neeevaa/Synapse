from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.permissions.dependencies import get_current_user
from app.activities.service import ActivityService
from app.activities.schemas import PaginatedActivityResponse
from app.common.responses import APIResponse, success_response

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[PaginatedActivityResponse],
    status_code=status.HTTP_200_OK,
    summary="Get user activity logs",
    description="Retrieves paginated user activity logs (newest first). Scoped to current user, or any company member if called by OWNER/ADMIN.",
)
def get_user_activities(
    user_id: UUID | None = Query(None, description="Optional target user ID (for OWNER/ADMIN review)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ActivityService(db)
    result = service.get_activities_for_user(
        current_user=current_user,
        target_user_id=user_id,
        page=page,
        limit=limit,
    )
    return success_response(
        message="User activities retrieved successfully.",
        data=result,
    )
