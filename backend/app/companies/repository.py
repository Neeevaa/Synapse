from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.company import Company


class CompanyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, company_id: UUID) -> Company | None:
        return self.db.execute(
            select(Company).filter(Company.id == company_id)
        ).scalar_one_or_none()

    def update(self, company: Company) -> Company:
        self.db.add(company)
        self.db.flush()
        return company
