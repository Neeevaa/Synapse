from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.enums import TestCaseCategory, TestCaseStatus
from app.testcases.schemas import (
    TestCaseResponse,
    TestCaseListResponse,
    TestCaseUpdate,
)
from app.testcases.service import TestCaseService
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response

router = APIRouter(prefix="/projects", tags=["Test Cases"])


@router.post(
    "/{project_id}/requirements/{requirement_id}/test-cases/generate",
    response_model=APIResponse[List[TestCaseResponse]],
    status_code=status.HTTP_201_CREATED,
    summary="Generate structured software test cases for requirement using AI",
)
def generate_test_cases(
    project_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    generated = service.generate_test_cases(project_id, requirement_id, current_user)
    return success_response(
        message="Test cases generated successfully.",
        data=generated,
    )


@router.get(
    "/{project_id}/requirements/{requirement_id}/test-cases",
    response_model=APIResponse[TestCaseListResponse],
    status_code=status.HTTP_200_OK,
    summary="List test cases for requirement with optional category and status filtering",
)
def list_test_cases(
    project_id: UUID,
    requirement_id: UUID,
    category: Optional[TestCaseCategory] = Query(None, description="Filter by test case category"),
    status_val: Optional[TestCaseStatus] = Query(None, alias="status", description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    result = service.list_test_cases(
        project_id=project_id,
        requirement_id=requirement_id,
        current_user=current_user,
        category=category,
        status=status_val,
    )
    return success_response(
        message="Test cases retrieved successfully.",
        data=result,
    )


@router.get(
    "/{project_id}/test-cases/{test_case_id}",
    response_model=APIResponse[TestCaseResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve single test case by ID",
)
def get_test_case(
    project_id: UUID,
    test_case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    result = service.get_test_case(project_id, test_case_id, current_user)
    return success_response(
        message="Test case retrieved successfully.",
        data=result,
    )


@router.patch(
    "/{project_id}/test-cases/{test_case_id}",
    response_model=APIResponse[TestCaseResponse],
    status_code=status.HTTP_200_OK,
    summary="Update test case details (maintains DRAFT status)",
)
def update_test_case(
    project_id: UUID,
    test_case_id: UUID,
    data: TestCaseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    result = service.update_test_case(project_id, test_case_id, data, current_user)
    return success_response(
        message="Test case updated successfully.",
        data=result,
    )


@router.post(
    "/{project_id}/test-cases/{test_case_id}/approve",
    response_model=APIResponse[TestCaseResponse],
    status_code=status.HTTP_200_OK,
    summary="Approve test case (transitions status to APPROVED)",
)
def approve_test_case(
    project_id: UUID,
    test_case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    result = service.approve_test_case(project_id, test_case_id, current_user)
    return success_response(
        message="Test case approved successfully.",
        data=result,
    )


@router.post(
    "/{project_id}/test-cases/{test_case_id}/reject",
    response_model=APIResponse[TestCaseResponse],
    status_code=status.HTTP_200_OK,
    summary="Reject test case (transitions status to REJECTED)",
)
def reject_test_case(
    project_id: UUID,
    test_case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    result = service.reject_test_case(project_id, test_case_id, current_user)
    return success_response(
        message="Test case rejected successfully.",
        data=result,
    )


@router.delete(
    "/{project_id}/test-cases/{test_case_id}",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete test case",
)
def delete_test_case(
    project_id: UUID,
    test_case_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = TestCaseService(db)
    service.delete_test_case(project_id, test_case_id, current_user)
    return success_response(
        message="Test case deleted successfully.",
        data=None,
    )
