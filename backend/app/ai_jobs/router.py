from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.ai_jobs.schemas import (
    CreateAIJobRequest,
    AIJobResponse,
    AIJobListResponse,
)
from app.ai_jobs.service import AIJobService
from app.common.responses import APIResponse, success_response
from app.permissions.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/ai/jobs/{job_id}",
    response_model=APIResponse[AIJobResponse],
    status_code=status.HTTP_200_OK,
    summary="Get status of an AI processing job",
)
def get_ai_job_status(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AIJobService(db)
    result = service.get_job_status(job_id, current_user)
    return success_response(
        message="AI Job status retrieved successfully.",
        data=result,
    )


@router.post(
    "/ai/jobs",
    response_model=APIResponse[AIJobResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Queue a new AI background job",
)
def create_ai_job(
    data: CreateAIJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AIJobService(db)
    result = service.create_job(data, current_user)
    return success_response(
        message="AI Job queued successfully.",
        data=result,
    )
