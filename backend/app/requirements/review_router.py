from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.requirements.review_schemas import (
    RequirementReviewResponse,
    FindingResponse,
    UpdateFindingDecisionRequest,
)
from app.requirements.review_service import RequirementReviewService
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response

router = APIRouter(prefix="/projects", tags=["AI Requirement Review"])


@router.post(
    "/{project_id}/requirements/{requirement_id}/reviews",
    response_model=APIResponse[RequirementReviewResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Trigger an AI-Assisted Requirement Review for target requirement version",
)
def create_requirement_review(
    project_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        service = RequirementReviewService(db)
        review = service.create_and_execute_review(project_id, requirement_id, current_user)
        return success_response(
            message="Requirement review completed successfully.",
            data=RequirementReviewResponse.model_validate(review),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/{project_id}/requirements/{requirement_id}/reviews",
    response_model=APIResponse[list[RequirementReviewResponse]],
    status_code=status.HTTP_200_OK,
    summary="List all historical AI reviews for a requirement",
)
def list_requirement_reviews(
    project_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RequirementReviewService(db)
    reviews = service.get_requirement_reviews(project_id, requirement_id, current_user)
    return success_response(
        message="Requirement reviews retrieved successfully.",
        data=[RequirementReviewResponse.model_validate(r) for r in reviews],
    )


@router.get(
    "/{project_id}/requirements/{requirement_id}/reviews/{review_id}",
    response_model=APIResponse[RequirementReviewResponse],
    status_code=status.HTTP_200_OK,
    summary="Get details of a specific AI requirement review",
)
def get_requirement_review_detail(
    project_id: UUID,
    requirement_id: UUID,
    review_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        service = RequirementReviewService(db)
        review = service.get_review_detail(project_id, requirement_id, review_id, current_user)
        return success_response(
            message="Requirement review detail retrieved.",
            data=RequirementReviewResponse.model_validate(review),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{project_id}/requirements/{requirement_id}/reviews/{review_id}/findings",
    response_model=APIResponse[list[FindingResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get findings for a specific AI requirement review",
)
def get_review_findings(
    project_id: UUID,
    requirement_id: UUID,
    review_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        service = RequirementReviewService(db)
        review = service.get_review_detail(project_id, requirement_id, review_id, current_user)
        return success_response(
            message="Review findings retrieved.",
            data=[FindingResponse.model_validate(f) for f in review.findings],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch(
    "/{project_id}/requirements/{requirement_id}/reviews/{review_id}/findings/{finding_id}",
    response_model=APIResponse[FindingResponse],
    status_code=status.HTTP_200_OK,
    summary="Update human review decision for a finding (ACCEPT, REJECT, MODIFY)",
)
def update_finding_decision(
    project_id: UUID,
    requirement_id: UUID,
    review_id: UUID,
    finding_id: UUID,
    request: UpdateFindingDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        service = RequirementReviewService(db)
        finding = service.update_finding_decision(
            project_id=project_id,
            requirement_id=requirement_id,
            review_id=review_id,
            finding_id=finding_id,
            request=request,
            current_user=current_user,
        )
        return success_response(
            message=f"Finding decision updated to {request.human_decision.value}.",
            data=FindingResponse.model_validate(finding),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
