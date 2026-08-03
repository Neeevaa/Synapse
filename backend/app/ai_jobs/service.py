from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_job import AIJob
from app.models.enums import AIJobStatus
from app.models.user import User
from app.ai_jobs.repository import AIJobRepository
from app.ai_jobs.schemas import (
    CreateAIJobRequest,
    AIJobResponse,
    AIJobListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden


class AIJobService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AIJobRepository(db)

    def _build_job_response(self, job: AIJob) -> AIJobResponse:
        return AIJobResponse(
            id=job.id,
            project_id=job.project_id,
            type=job.type,
            status=job.status if isinstance(job.status, str) else job.status.value,
            created_by=job.created_by,
            error_message=job.error_message,
            result_metadata=job.result_metadata,
            started_at=job.started_at,
            finished_at=job.finished_at,
            created_at=job.created_at,
        )

    def get_job_status(self, job_id: UUID, current_user: User) -> AIJobResponse:
        job = self.repo.get_job(job_id)
        if not job:
            raise ResourceNotFound("AI Job not found.")

        if str(job.created_by) != str(current_user.id) and current_user.role not in ["OWNER", "ADMIN"]:
            raise Forbidden("You do not have permission to view this job status.")

        return self._build_job_response(job)

    def create_job(self, data: CreateAIJobRequest, current_user: User) -> AIJobResponse:
        try:
            job = AIJob(
                project_id=data.project_id,
                type=data.type.strip(),
                status=AIJobStatus.QUEUED,
                created_by=current_user.id,
                result_metadata=data.result_metadata or {},
            )
            self.repo.create_job(job)
            self.db.commit()
            self.db.refresh(job)

            return self._build_job_response(job)
        except Exception as e:
            self.db.rollback()
            raise e
