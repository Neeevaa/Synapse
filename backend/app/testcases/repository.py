from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload

from app.models.test_case import TestCase
from app.models.enums import TestCaseCategory, TestCaseStatus


class TestCaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, test_case: TestCase) -> TestCase:
        self.db.add(test_case)
        self.db.commit()
        self.db.refresh(test_case)
        return test_case

    def bulk_create(self, test_cases: List[TestCase]) -> List[TestCase]:
        for tc in test_cases:
            self.db.add(tc)
        self.db.commit()
        for tc in test_cases:
            self.db.refresh(tc)
        return test_cases

    def get_by_id(
        self,
        test_case_id: UUID,
        project_id: Optional[UUID] = None,
        company_id: Optional[UUID] = None,
    ) -> Optional[TestCase]:
        query = (
            select(TestCase)
            .options(
                joinedload(TestCase.creator),
                joinedload(TestCase.approver),
            )
            .filter(TestCase.id == test_case_id)
        )
        if project_id:
            query = query.filter(TestCase.project_id == project_id)
        if company_id:
            query = query.filter(TestCase.company_id == company_id)

        return self.db.execute(query).unique().scalar_one_or_none()

    def list_by_requirement(
        self,
        requirement_id: UUID,
        project_id: UUID,
        company_id: UUID,
        category: Optional[TestCaseCategory] = None,
        status: Optional[TestCaseStatus] = None,
    ) -> List[TestCase]:
        query = (
            select(TestCase)
            .options(
                joinedload(TestCase.creator),
                joinedload(TestCase.approver),
            )
            .filter(
                TestCase.requirement_id == requirement_id,
                TestCase.project_id == project_id,
                TestCase.company_id == company_id,
            )
        )
        if category:
            query = query.filter(TestCase.category == category)
        if status:
            query = query.filter(TestCase.status == status)

        query = query.order_by(TestCase.created_at.asc())
        return list(self.db.execute(query).unique().scalars().all())

    def get_counts_by_status(
        self,
        requirement_id: UUID,
        project_id: UUID,
        company_id: UUID,
    ) -> dict[str, int]:
        counts = {"DRAFT": 0, "APPROVED": 0, "REJECTED": 0}
        rows = self.db.execute(
            select(TestCase.status, func.count(TestCase.id))
            .filter(
                TestCase.requirement_id == requirement_id,
                TestCase.project_id == project_id,
                TestCase.company_id == company_id,
            )
            .group_by(TestCase.status)
        ).all()
        for status_val, count in rows:
            counts[status_val.value if hasattr(status_val, "value") else str(status_val)] = count
        return counts

    def get_counts_by_category(
        self,
        requirement_id: UUID,
        project_id: UUID,
        company_id: UUID,
    ) -> dict[str, int]:
        counts = {
            "FUNCTIONAL": 0,
            "NEGATIVE": 0,
            "BOUNDARY": 0,
            "ACCEPTANCE": 0,
        }
        rows = self.db.execute(
            select(TestCase.category, func.count(TestCase.id))
            .filter(
                TestCase.requirement_id == requirement_id,
                TestCase.project_id == project_id,
                TestCase.company_id == company_id,
            )
            .group_by(TestCase.category)
        ).all()
        for cat_val, count in rows:
            counts[cat_val.value if hasattr(cat_val, "value") else str(cat_val)] = count
        return counts

    def update(self, test_case: TestCase) -> TestCase:
        self.db.commit()
        self.db.refresh(test_case)
        return test_case

    def delete(self, test_case: TestCase) -> None:
        self.db.delete(test_case)
        self.db.commit()
