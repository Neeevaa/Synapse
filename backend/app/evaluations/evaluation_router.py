from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.evaluations.evaluation_schemas import (
    CreateEvaluationDatasetRequest,
    EvaluationDatasetResponse,
    CreateEvaluationCaseRequest,
    EvaluationCaseResponse,
    CreateEvaluationRunRequest,
    EvaluationRunResponse,
)
from app.evaluations.evaluation_service import EvaluationService
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response

router = APIRouter(prefix="/admin/evaluations", tags=["Super Admin Research Evaluation"])


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Super Admin research evaluation.",
        )
    return current_user


@router.post(
    "/datasets",
    response_model=APIResponse[EvaluationDatasetResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new evaluation dataset (Super Admin only)",
)
def create_evaluation_dataset(
    request: CreateEvaluationDatasetRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    service = EvaluationService(db)
    dataset = service.create_dataset(request, current_user)
    return success_response(
        message="Evaluation dataset created successfully.",
        data=EvaluationDatasetResponse.model_validate(dataset),
    )


@router.get(
    "/datasets",
    response_model=APIResponse[list[EvaluationDatasetResponse]],
    status_code=status.HTTP_200_OK,
    summary="List all evaluation datasets (Super Admin only)",
)
def list_evaluation_datasets(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    service = EvaluationService(db)
    datasets = service.list_datasets()
    resp_data = []
    for d in datasets:
        resp = EvaluationDatasetResponse.model_validate(d)
        resp.case_count = len(d.cases) if d.cases else 0
        resp_data.append(resp)
    return success_response(
        message="Evaluation datasets retrieved.",
        data=resp_data,
    )


@router.post(
    "/datasets/{dataset_id}/cases",
    response_model=APIResponse[EvaluationCaseResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add a human-verified evaluation case to dataset (Super Admin only)",
)
def add_evaluation_case(
    dataset_id: UUID,
    request: CreateEvaluationCaseRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    try:
        service = EvaluationService(db)
        case = service.add_case(dataset_id, request)
        return success_response(
            message="Evaluation case added successfully.",
            data=EvaluationCaseResponse.model_validate(case),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/datasets/{dataset_id}/cases",
    response_model=APIResponse[list[EvaluationCaseResponse]],
    status_code=status.HTTP_200_OK,
    summary="List cases in an evaluation dataset (Super Admin only)",
)
def list_evaluation_cases(
    dataset_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    try:
        service = EvaluationService(db)
        cases = service.list_cases(dataset_id)
        return success_response(
            message="Evaluation cases retrieved.",
            data=[EvaluationCaseResponse.model_validate(c) for c in cases],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/runs",
    response_model=APIResponse[EvaluationRunResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Execute an evaluation experiment run (Super Admin only)",
)
def create_evaluation_run(
    request: CreateEvaluationRunRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    try:
        service = EvaluationService(db)
        run = service.execute_evaluation_run(request, current_user)
        return success_response(
            message=f"Evaluation run completed for condition {request.condition.value}.",
            data=EvaluationRunResponse.model_validate(run),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Evaluation run failed: {str(e)}")


@router.get(
    "/runs",
    response_model=APIResponse[list[EvaluationRunResponse]],
    status_code=status.HTTP_200_OK,
    summary="List all evaluation experiment runs (Super Admin only)",
)
def list_evaluation_runs(
    dataset_id: Optional[UUID] = None,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    service = EvaluationService(db)
    runs = service.list_runs(dataset_id)
    return success_response(
        message="Evaluation runs retrieved.",
        data=[EvaluationRunResponse.model_validate(r) for r in runs],
    )


@router.get(
    "/runs/{run_id}",
    response_model=APIResponse[EvaluationRunResponse],
    status_code=status.HTTP_200_OK,
    summary="Get details of an evaluation experiment run (Super Admin only)",
)
def get_evaluation_run_detail(
    run_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    try:
        service = EvaluationService(db)
        run = service.get_run_detail(run_id)
        return success_response(
            message="Evaluation run detail retrieved.",
            data=EvaluationRunResponse.model_validate(run),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/runs/{run_id}/metrics",
    response_model=APIResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Get authoritative backend-persisted aggregate metrics for run (Super Admin only)",
)
def get_evaluation_run_metrics(
    run_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    try:
        service = EvaluationService(db)
        run = service.get_run_detail(run_id)
        metrics_dict = {
            "condition": run.condition.value,
            "model_name": run.model_name,
            "prompt_version": run.prompt_version,
            "embedding_model": run.embedding_model,
            "retrieval_top_k": run.retrieval_top_k,
            "aggregate_precision": run.aggregate_precision,
            "aggregate_recall": run.aggregate_recall,
            "aggregate_f1": run.aggregate_f1,
            "aggregate_precision_at_k": run.aggregate_precision_at_k,
            "aggregate_recall_at_k": run.aggregate_recall_at_k,
            "aggregate_mrr": run.aggregate_mrr,
            "aggregate_grounding_rate": run.aggregate_grounding_rate,
            "aggregate_insufficient_context_rate": run.aggregate_insufficient_context_rate,
            "aggregate_human_acceptance_rate": run.aggregate_human_acceptance_rate,
            "aggregate_human_rejection_rate": run.aggregate_human_rejection_rate,
            "aggregate_human_modification_rate": run.aggregate_human_modification_rate,
            "avg_retrieval_latency_ms": run.avg_retrieval_latency_ms,
            "avg_generation_latency_ms": run.avg_generation_latency_ms,
            "avg_total_latency_ms": run.avg_total_latency_ms,
            "metrics_by_requirement_type": run.metrics_by_requirement_type,
            "metrics_by_context_type": run.metrics_by_context_type,
        }
        return success_response(
            message="Evaluation run metrics retrieved.",
            data=metrics_dict,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
