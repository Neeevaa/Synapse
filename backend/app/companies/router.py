from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.enums import CompanyRole
from app.permissions.dependencies import get_current_user, require_admin
from app.companies.service import CompanyService
from app.companies.schemas import (
    CompanyResponse,
    CompanyProfileUpdateRequest,
    CompanySettingsUpdateRequest,
    CompanyPlanUpdateRequest,
)
from app.common.responses import success_response
from app.common.exceptions import Forbidden, ResourceNotFound

from app.core.plans import PLAN_DEFINITIONS

router = APIRouter()


@router.get("/plans", status_code=status.HTTP_200_OK)
def get_subscription_plans():
    """
    Returns full official subscription plan definitions and entitlement limits for all 4 tiers.
    """
    return success_response(
        data=PLAN_DEFINITIONS,
        message="Subscription plan definitions retrieved successfully.",
    )


@router.get("/me", status_code=status.HTTP_200_OK)
def get_my_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.company_id:
        raise ResourceNotFound("User is not associated with any company.")

    service = CompanyService(db)
    company = service.get_company(current_user.company_id)
    return success_response(
        data=CompanyResponse.from_company(company),
        message="Company profile retrieved successfully.",
    )


@router.patch("/me", status_code=status.HTTP_200_OK)
def update_my_company_profile(
    data: CompanyProfileUpdateRequest,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    if not current_user.company_id:
        raise ResourceNotFound("User is not associated with any company.")

    service = CompanyService(db)
    updated = service.update_profile(current_user.company_id, data)
    return success_response(
        data=CompanyResponse.from_company(updated),
        message="Company profile updated successfully.",
    )


@router.patch("/me/settings", status_code=status.HTTP_200_OK)
def update_my_company_settings(
    data: CompanySettingsUpdateRequest,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    if not current_user.company_id:
        raise ResourceNotFound("User is not associated with any company.")

    service = CompanyService(db)
    updated = service.update_settings(current_user.company_id, data)
    return success_response(
        data=CompanyResponse.from_company(updated),
        message="Company settings updated successfully.",
    )


@router.patch("/me/plan", status_code=status.HTTP_200_OK)
def update_my_company_plan(
    data: CompanyPlanUpdateRequest,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    if not current_user.company_id:
        raise ResourceNotFound("User is not associated with any company.")

    service = CompanyService(db)
    updated = service.update_plan(current_user.company_id, data)
    return success_response(
        data=CompanyResponse.from_company(updated),
        message="Subscription plan updated successfully.",
    )


@router.get("/{company_id}", status_code=status.HTTP_200_OK)
def get_company_by_id(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.company_id) != str(company_id):
        raise Forbidden("You do not have access to this company.")

    service = CompanyService(db)
    company = service.get_company(company_id)
    return success_response(
        data=CompanyResponse.from_company(company),
        message="Company details retrieved successfully.",
    )


@router.patch("/{company_id}", status_code=status.HTTP_200_OK)
def update_company_by_id(
    company_id: UUID,
    data: CompanyProfileUpdateRequest,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db),
):
    if str(current_user.company_id) != str(company_id):
        raise Forbidden("You do not have permission to modify this company.")

    service = CompanyService(db)
    updated = service.update_profile(company_id, data)
    return success_response(
        data=CompanyResponse.from_company(updated),
        message="Company profile updated successfully.",
    )
