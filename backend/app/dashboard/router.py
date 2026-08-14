from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dashboard.schemas import DashboardContextResponse
from app.dashboard.service import DashboardService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/context",
    response_model=APIResponse[DashboardContextResponse],
    status_code=status.HTTP_200_OK,
    summary="Get server-driven dashboard workspace context",
    description="Returns authorized user roles, projects, active project workspace context, server-computed capabilities, and metrics.",
)
def get_dashboard_context(
    project_id: UUID | None = Query(None, description="Optional active project ID to switch context"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DashboardService(db)
    result = service.get_dashboard_context(current_user, project_id)
    return success_response(message="Dashboard context retrieved successfully.", data=result)
