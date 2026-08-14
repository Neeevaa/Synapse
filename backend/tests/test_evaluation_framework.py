import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.enums import CompanyRole, RequirementType, EvaluationCaseType, EvaluationCondition
from app.evaluations.metrics import (
    calculate_precision,
    calculate_recall,
    calculate_f1,
    calculate_classification_tp_fp_fn,
    calculate_precision_at_k,
    calculate_recall_at_k,
    calculate_mrr,
    calculate_subgroup_metrics,
)
from app.core.security import create_access_token
from tests.conftest import create_company, create_user


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_deterministic_hand_calculated_classification_metrics():
    """
    Hand-calculated multi-label metric test:
    Ground Truth: AMBIGUITY, INCOMPLETENESS
    Predicted:    AMBIGUITY, TESTABILITY
    
    Expected:
    TP = 1 (AMBIGUITY)
    FP = 1 (TESTABILITY)
    FN = 1 (INCOMPLETENESS)
    Precision = 1/2 = 0.50
    Recall    = 1/2 = 0.50
    F1        = 1/2 = 0.50
    """
    expected = ["AMBIGUITY", "INCOMPLETENESS"]
    predicted = ["AMBIGUITY", "TESTABILITY"]

    tp, fp, fn, tn = calculate_classification_tp_fp_fn(expected, predicted)

    assert tp == 1
    assert fp == 1
    assert fn == 1
    assert tn == 0  # TN retained in DB schema for structural completeness

    prec = calculate_precision(tp, fp)
    rec = calculate_recall(tp, fn)
    f1 = calculate_f1(prec, rec)

    assert prec == 0.5
    assert rec == 0.5
    assert f1 == 0.5


def test_retrieval_precision_at_k_safeguard_fewer_than_k_results():
    """
    Precision@K with fewer than K results safeguard:
    Retrieved: ["MTG-Security Sync"] (1 result)
    Expected:  ["MTG-Security Sync", "REQ-101"]
    K = 5

    Denominator should be min(5, 1) = 1.
    Matched = 1.
    Precision@K = 1 / 1 = 1.0 (No artificial penalty).
    """
    retrieved = ["MTG-Security Sync"]
    expected = ["MTG-Security Sync", "REQ-101"]

    p_at_k = calculate_precision_at_k(retrieved, expected, k=5)
    r_at_k = calculate_recall_at_k(retrieved, expected)
    mrr_val = calculate_mrr(retrieved, expected)

    assert p_at_k == 1.0
    assert r_at_k == 0.5
    assert mrr_val == 1.0


def test_subgroup_metrics_breakdown():
    raw_case_results = [
        {"case_id": "c1", "tp": 2, "fp": 0, "fn": 0},
        {"case_id": "c2", "tp": 1, "fp": 1, "fn": 1},
    ]
    case_map = {
        "c1": {"requirement_type": "FUNCTIONAL", "case_type": "CONTEXT_RICH"},
        "c2": {"requirement_type": "NON_FUNCTIONAL", "case_type": "CONTEXT_POOR"},
    }

    by_req, by_ctx = calculate_subgroup_metrics(raw_case_results, case_map)

    assert "FUNCTIONAL" in by_req
    assert by_req["FUNCTIONAL"]["f1"] == 1.0
    assert "NON_FUNCTIONAL" in by_req
    assert by_req["NON_FUNCTIONAL"]["f1"] == 0.5

    assert "CONTEXT_RICH" in by_ctx
    assert "CONTEXT_POOR" in by_ctx


def test_evaluation_dataset_and_case_creation(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Eval Co 1")
    sa = create_user(db_session, co, email="sa_eval1@synapse.com", role=CompanyRole.ADMIN)
    sa.is_super_admin = True
    db_session.commit()

    headers = get_auth_headers(sa.id)

    # 1. Create Dataset
    ds_payload = {
        "name": "Benchmark Requirement Dataset v1",
        "description": "Curated human-verified requirements benchmark",
        "version": "1.0"
    }
    res_ds = client.post("/admin/evaluations/datasets", json=ds_payload, headers=headers)
    assert res_ds.status_code == 201, res_ds.text
    ds_data = res_ds.json()["data"]
    ds_id = ds_data["id"]

    # 2. Add Case
    case_payload = {
        "case_type": "CONTEXT_RICH",
        "requirement_text": "Tokens must expire in 15 minutes and rotate on usage.",
        "requirement_type": "SECURITY" if hasattr(RequirementType, "SECURITY") else "NON_FUNCTIONAL",
        "project_context": "[SOURCE: MTG-Security Sync]\nMeeting agreed on 15 minute token rotation.",
        "expected_issue_types": ["INCONSISTENCY"],
        "expected_severities": ["HIGH"],
        "expected_sources": ["MTG-Security Sync"],
        "has_issue": True,
        "ground_truth_notes": "Verified by security lead."
    }
    res_case = client.post(f"/admin/evaluations/datasets/{ds_id}/cases", json=case_payload, headers=headers)
    assert res_case.status_code == 201, res_case.text
    case_data = res_case.json()["data"]
    assert case_data["expected_issue_types"] == ["INCONSISTENCY"]


def test_evaluation_condition_llm_only(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Eval Co 2")
    sa = create_user(db_session, co, email="sa_eval2@synapse.com", role=CompanyRole.ADMIN)
    sa.is_super_admin = True
    db_session.commit()

    headers = get_auth_headers(sa.id)

    # Create Dataset & Case
    ds_res = client.post("/admin/evaluations/datasets", json={"name": "LLM Only DS", "version": "1.0"}, headers=headers)
    ds_id = ds_res.json()["data"]["id"]

    client.post(
        f"/admin/evaluations/datasets/{ds_id}/cases",
        json={
            "case_type": "CONTEXT_POOR",
            "requirement_text": "System shall process orders quickly.",
            "requirement_type": "NON_FUNCTIONAL",
            "expected_issue_types": ["AMBIGUITY"],
            "expected_severities": ["MEDIUM"],
            "expected_sources": [],
            "has_issue": True,
        },
        headers=headers,
    )

    # Run LLM_ONLY condition
    run_payload = {
        "dataset_id": ds_id,
        "condition": "LLM_ONLY",
        "model_name": "mock-deterministic-v1",
        "prompt_version": "REQUIREMENT_REVIEW_PROMPT_V1",
        "embedding_model": "text-embedding-3-small",  # Service must strictly override to NULL
        "retrieval_top_k": 5
    }
    res_run = client.post("/admin/evaluations/runs", json=run_payload, headers=headers)
    assert res_run.status_code == 201, res_run.text
    run_data = res_run.json()["data"]

    assert run_data["condition"] == "LLM_ONLY"
    assert run_data["embedding_model"] is None  # Input boundary enforced
    assert run_data["status"] == "COMPLETED"


def test_evaluation_condition_rag_llm(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Eval Co 3")
    sa = create_user(db_session, co, email="sa_eval3@synapse.com", role=CompanyRole.ADMIN)
    sa.is_super_admin = True
    db_session.commit()

    headers = get_auth_headers(sa.id)

    ds_res = client.post("/admin/evaluations/datasets", json={"name": "RAG LLM DS", "version": "1.0"}, headers=headers)
    ds_id = ds_res.json()["data"]["id"]

    client.post(
        f"/admin/evaluations/datasets/{ds_id}/cases",
        json={
            "case_type": "CONTEXT_RICH",
            "requirement_text": "OAuth2 authentication with token refresh.",
            "requirement_type": "FUNCTIONAL",
            "project_context": "[SOURCE: MTG-Security Sync]\nTokens expire in 15 mins.",
            "expected_issue_types": ["INCONSISTENCY"],
            "expected_severities": ["HIGH"],
            "expected_sources": ["MTG-Security Sync"],
            "has_issue": True,
        },
        headers=headers,
    )

    run_payload = {
        "dataset_id": ds_id,
        "condition": "RAG_LLM",
        "model_name": "mock-deterministic-v1",
        "prompt_version": "REQUIREMENT_REVIEW_PROMPT_V1",
        "embedding_model": "text-embedding-3-small",
        "retrieval_top_k": 5
    }
    res_run = client.post("/admin/evaluations/runs", json=run_payload, headers=headers)
    assert res_run.status_code == 201
    run_data = res_run.json()["data"]

    assert run_data["condition"] == "RAG_LLM"
    assert run_data["embedding_model"] == "text-embedding-3-small"
    assert "metrics_by_requirement_type" in run_data


def test_super_admin_rbac_and_privacy_controls(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Eval Co Priv")
    reg_user = create_user(db_session, co, email="user_eval_priv@co.com", role=CompanyRole.ADMIN)
    reg_user.is_super_admin = False
    db_session.commit()

    headers = get_auth_headers(reg_user.id)

    # Regular user attempting access -> 403 Forbidden
    res_ds = client.get("/admin/evaluations/datasets", headers=headers)
    assert res_ds.status_code == 403
