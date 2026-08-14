from uuid import UUID
from typing import Optional
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.requirement import Requirement, RequirementVersion
from app.models.enums import (
    RequirementType,
    RequirementStatus,
    RequirementPriority,
)


class RequirementRepository:
    def __init__(self, db: Session):
        self.db = db

    def generate_requirement_key(self, project_id: UUID) -> str:
        count = self.db.scalar(
            select(func.count(Requirement.id)).filter(Requirement.project_id == project_id)
        ) or 0
        return f"REQ-{count + 1}"

    def create_requirement(self, requirement: Requirement) -> Requirement:
        self.db.add(requirement)
        self.db.commit()
        self.db.refresh(requirement)
        return requirement

    def create_version(self, version: RequirementVersion) -> RequirementVersion:
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        return version

    def get_requirement(self, requirement_id: UUID, project_id: UUID) -> Optional[Requirement]:
        return self.db.execute(
            select(Requirement)
            .options(
                joinedload(Requirement.creator),
                joinedload(Requirement.versions).joinedload(RequirementVersion.author),
            )
            .filter(
                Requirement.id == requirement_id,
                Requirement.project_id == project_id,
            )
        ).unique().scalar_one_or_none()

    def list_requirements(
        self,
        project_id: UUID,
        requirement_type: Optional[RequirementType] = None,
        priority: Optional[RequirementPriority] = None,
        status: Optional[RequirementStatus] = None,
        created_by: Optional[UUID] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Requirement], int]:
        stmt = (
            select(Requirement)
            .options(
                joinedload(Requirement.creator),
                joinedload(Requirement.versions).joinedload(RequirementVersion.author),
            )
            .filter(Requirement.project_id == project_id)
        )

        if requirement_type:
            stmt = stmt.filter(Requirement.requirement_type == requirement_type)
        if priority:
            stmt = stmt.filter(Requirement.priority == priority)
        if status:
            stmt = stmt.filter(Requirement.status == status)
        if created_by:
            stmt = stmt.filter(Requirement.created_by == created_by)
        if keyword:
            pattern = f"%{keyword.strip()}%"
            stmt = stmt.filter(
                or_(
                    Requirement.title.ilike(pattern),
                    Requirement.description.ilike(pattern),
                    Requirement.requirement_key.ilike(pattern),
                    Requirement.acceptance_criteria.ilike(pattern),
                )
            )

        # Count total records matching filters
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.scalar(count_stmt) or 0

        # Order by key / created_at descending
        stmt = stmt.order_by(desc(Requirement.created_at))
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        results = self.db.execute(stmt).scalars().unique().all()
        return list(results), total
