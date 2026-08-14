from typing import Optional
from uuid import UUID
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, joinedload

from app.models.evaluation import (
    EvaluationDataset,
    EvaluationCase,
    EvaluationRun,
    EvaluationCaseResult,
)


class EvaluationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_dataset(self, dataset: EvaluationDataset) -> EvaluationDataset:
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def list_datasets(self) -> list[EvaluationDataset]:
        stmt = (
            select(EvaluationDataset)
            .options(joinedload(EvaluationDataset.cases))
            .order_by(desc(EvaluationDataset.created_at))
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_dataset_by_id(self, dataset_id: UUID) -> Optional[EvaluationDataset]:
        stmt = (
            select(EvaluationDataset)
            .options(joinedload(EvaluationDataset.cases))
            .filter(EvaluationDataset.id == dataset_id)
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def create_case(self, case: EvaluationCase) -> EvaluationCase:
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)
        return case

    def list_cases_for_dataset(self, dataset_id: UUID) -> list[EvaluationCase]:
        stmt = (
            select(EvaluationCase)
            .filter(EvaluationCase.dataset_id == dataset_id)
            .order_by(EvaluationCase.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_case_by_id(self, case_id: UUID) -> Optional[EvaluationCase]:
        stmt = (
            select(EvaluationCase)
            .filter(EvaluationCase.id == case_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create_run(self, run: EvaluationRun) -> EvaluationRun:
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def list_runs(self, dataset_id: Optional[UUID] = None) -> list[EvaluationRun]:
        stmt = select(EvaluationRun).options(joinedload(EvaluationRun.case_results))
        if dataset_id:
            stmt = stmt.filter(EvaluationRun.dataset_id == dataset_id)
        stmt = stmt.order_by(desc(EvaluationRun.started_at))
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_run_by_id(self, run_id: UUID) -> Optional[EvaluationRun]:
        stmt = (
            select(EvaluationRun)
            .options(joinedload(EvaluationRun.case_results))
            .filter(EvaluationRun.id == run_id)
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def update_run(self, run: EvaluationRun) -> EvaluationRun:
        self.db.commit()
        self.db.refresh(run)
        return run

    def create_case_results(self, results: list[EvaluationCaseResult]) -> list[EvaluationCaseResult]:
        for res in results:
            self.db.add(res)
        self.db.commit()
        return results
