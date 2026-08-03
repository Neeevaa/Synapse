from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_job import AIJob


class AIJobRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_job(self, job_id: UUID) -> AIJob | None:
        return self.db.execute(select(AIJob).filter(AIJob.id == job_id)).scalar_one_or_none()

    def get_jobs_by_user(self, user_id: UUID) -> list[AIJob]:
        result = self.db.execute(
            select(AIJob)
            .filter(AIJob.created_by == user_id)
            .order_by(AIJob.created_at.desc())
        )
        return list(result.scalars().all())

    def create_job(self, job: AIJob) -> AIJob:
        self.db.add(job)
        return job
