from uuid import UUID
from sqlalchemy.orm import Session
from app.companies.repository import CompanyRepository
from app.companies.schemas import (
    CompanyProfileUpdateRequest,
    CompanySettingsUpdateRequest,
    CompanyPlanUpdateRequest,
)
from app.common.exceptions import ResourceNotFound
from app.common.helpers import slugify


class CompanyService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CompanyRepository(db)

    def get_company(self, company_id: UUID):
        company = self.repo.get_by_id(company_id)
        if not company:
            raise ResourceNotFound("Company not found.")
        return company

    def update_profile(self, company_id: UUID, data: CompanyProfileUpdateRequest):
        company = self.get_company(company_id)

        if data.name is not None:
            company.name = data.name.strip()
            company.slug = slugify(company.name)

        if data.description is not None:
            company.description = data.description.strip() if data.description else None

        if data.logo_url is not None:
            company.logo_url = data.logo_url.strip() if data.logo_url else None

        self.repo.update(company)
        self.db.commit()
        self.db.refresh(company)
        return company

    def update_settings(self, company_id: UUID, data: CompanySettingsUpdateRequest):
        company = self.get_company(company_id)

        if data.default_project_visibility is not None:
            company.default_project_visibility = data.default_project_visibility.strip().upper()

        self.repo.update(company)
        self.db.commit()
        self.db.refresh(company)
        return company

    def update_plan(self, company_id: UUID, data: CompanyPlanUpdateRequest):
        company = self.get_company(company_id)
        company.subscription_plan = data.subscription_plan

        self.repo.update(company)
        self.db.commit()
        self.db.refresh(company)
        return company
