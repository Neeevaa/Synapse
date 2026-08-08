from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import SubscriptionPlan
from app.core.plans import get_plan_definition


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None = None
    logo_url: str | None = None
    default_project_visibility: str = "PRIVATE"
    subscription_plan: SubscriptionPlan = SubscriptionPlan.FREE
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    entitlements: dict | None = None

    @classmethod
    def from_company(cls, company):
        res = cls.model_validate(company)
        res.entitlements = get_plan_definition(company.subscription_plan)
        return res


class CompanyProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = Field(None, max_length=2000)
    logo_url: str | None = Field(None, max_length=500)


class CompanySettingsUpdateRequest(BaseModel):
    default_project_visibility: str | None = Field(None, max_length=50)


class CompanyPlanUpdateRequest(BaseModel):
    subscription_plan: SubscriptionPlan
