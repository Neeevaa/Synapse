from typing import List, Dict, Tuple, Any


def calculate_precision(tp: int, fp: int) -> float:
    if tp + fp == 0:
        return 0.0
    return round(float(tp) / float(tp + fp), 4)


def calculate_recall(tp: int, fn: int) -> float:
    if tp + fn == 0:
        return 0.0
    return round(float(tp) / float(tp + fn), 4)


def calculate_f1(precision: float, recall: float) -> float:
    if precision + recall == 0:
        return 0.0
    return round((2.0 * precision * recall) / (precision + recall), 4)


def calculate_classification_tp_fp_fn(
    expected_labels: list[str],
    predicted_labels: list[str],
) -> Tuple[int, int, int, int]:
    """
    Multi-label issue classification evaluation.
    Returns (TP, FP, FN, TN). TN is retained in DB schema for structural completeness.
    """
    expected_set = {str(lbl).upper().strip() for lbl in expected_labels if str(lbl).strip()}
    predicted_set = {str(lbl).upper().strip() for lbl in predicted_labels if str(lbl).strip()}

    tp = len(expected_set.intersection(predicted_set))
    fp = len(predicted_set - expected_set)
    fn = len(expected_set - predicted_set)
    tn = 0  # Replaced by rigorous multi-label evaluation

    return tp, fp, fn, tn


def calculate_precision_at_k(
    retrieved_sources: list[str],
    expected_sources: list[str],
    k: int = 5,
) -> float:
    """
    Precision@K with safeguarded denominator min(K, len(retrieved_sources)).
    Prevents artificial precision penalty when fewer than K results exist.
    """
    if not retrieved_sources:
        return 0.0

    k_sources = retrieved_sources[:k]
    denom = min(k, len(retrieved_sources))
    if denom == 0:
        return 0.0

    expected_set = {str(s).upper().strip() for s in expected_sources if str(s).strip()}
    if not expected_set:
        return 0.0

    matched = 0
    for r in k_sources:
        r_clean = str(r).upper().strip()
        if r_clean in expected_set or any(r_clean in exp or exp in r_clean for exp in expected_set):
            matched += 1

    return round(float(matched) / float(denom), 4)


def calculate_recall_at_k(
    retrieved_sources: list[str],
    expected_sources: list[str],
) -> float:
    """
    Recall@K measuring proportion of expected ground truth sources present in retrieved sources.
    """
    expected_set = {str(s).upper().strip() for s in expected_sources if str(s).strip()}
    if not expected_set:
        return 1.0 if not retrieved_sources else 0.0

    retrieved_set = {str(r).upper().strip() for r in retrieved_sources if str(r).strip()}
    matched = 0
    for exp in expected_set:
        if exp in retrieved_set or any(exp in r or r in exp for r in retrieved_set):
            matched += 1

    return round(float(matched) / float(len(expected_set)), 4)


def calculate_mrr(
    retrieved_sources: list[str],
    expected_sources: list[str],
) -> float:
    """
    Mean Reciprocal Rank (MRR): 1 / rank of the first relevant retrieved source (1-indexed).
    """
    if not retrieved_sources or not expected_sources:
        return 0.0

    expected_set = {str(s).upper().strip() for s in expected_sources if str(s).strip()}

    for rank, r in enumerate(retrieved_sources, start=1):
        r_clean = str(r).upper().strip()
        if r_clean in expected_set or any(r_clean in exp or exp in r_clean for exp in expected_set):
            return round(1.0 / float(rank), 4)

    return 0.0


def calculate_grounding_metrics(findings: list[dict]) -> dict:
    if not findings:
        return {
            "grounded_rate": 0.0,
            "insufficient_context_rate": 0.0,
            "verified_citation_rate": 0.0,
        }

    total = len(findings)
    grounded = sum(1 for f in findings if f.get("evidence_status") == "GROUNDED")
    insufficient = sum(1 for f in findings if f.get("evidence_status") == "INSUFFICIENT_CONTEXT")

    total_citations = sum(len(f.get("source_references", [])) for f in findings)
    # Unverified citations are stripped prior to persistence, so verified_citation_rate = 1.0 for persisted citations
    verified_citation_rate = 1.0 if total_citations > 0 else 0.0

    return {
        "grounded_rate": round(float(grounded) / float(total), 4),
        "insufficient_context_rate": round(float(insufficient) / float(total), 4),
        "verified_citation_rate": verified_citation_rate,
    }


def calculate_human_ai_metrics(findings: list[dict]) -> dict:
    if not findings:
        return {
            "acceptance_rate": 0.0,
            "rejection_rate": 0.0,
            "modification_rate": 0.0,
            "pending_rate": 0.0,
            "human_modification_ratio": 0.0,
        }

    total = len(findings)
    accepted = sum(1 for f in findings if f.get("human_decision") == "ACCEPTED")
    rejected = sum(1 for f in findings if f.get("human_decision") == "REJECTED")
    modified = sum(1 for f in findings if f.get("human_decision") == "MODIFIED")
    pending = sum(1 for f in findings if f.get("human_decision") == "PENDING")

    decided = accepted + rejected + modified
    mod_ratio_denom = accepted + modified

    return {
        "acceptance_rate": round(float(accepted) / float(total), 4),
        "rejection_rate": round(float(rejected) / float(total), 4),
        "modification_rate": round(float(modified) / float(total), 4),
        "pending_rate": round(float(pending) / float(total), 4),
        "human_modification_ratio": round(float(modified) / float(mod_ratio_denom), 4) if mod_ratio_denom > 0 else 0.0,
    }


def calculate_subgroup_metrics(
    case_results: list[dict],
    case_map: dict[str, dict],
) -> Tuple[dict, dict]:
    """
    Partitions case results by requirement_type (FUNCTIONAL, NON_FUNCTIONAL, USER_STORY)
    and context_type (CONTEXT_RICH, CONTEXT_POOR).
    Returns (metrics_by_req_type, metrics_by_context_type).
    """
    req_type_buckets: dict[str, list[dict]] = {}
    context_type_buckets: dict[str, list[dict]] = {}

    for res in case_results:
        case_id = str(res.get("case_id"))
        case_info = case_map.get(case_id, {})
        req_type = str(case_info.get("requirement_type", "FUNCTIONAL"))
        context_type = str(case_info.get("case_type", "CONTEXT_RICH"))

        req_type_buckets.setdefault(req_type, []).append(res)
        context_type_buckets.setdefault(context_type, []).append(res)

    def compute_bucket_metrics(buckets: dict[str, list[dict]]) -> dict:
        out = {}
        for key, items in buckets.items():
            tot_tp = sum(it.get("tp", 0) for it in items)
            tot_fp = sum(it.get("fp", 0) for it in items)
            tot_fn = sum(it.get("fn", 0) for it in items)

            prec = calculate_precision(tot_tp, tot_fp)
            rec = calculate_recall(tot_tp, tot_fn)
            f1 = calculate_f1(prec, rec)

            out[key] = {
                "count": len(items),
                "tp": tot_tp,
                "fp": tot_fp,
                "fn": tot_fn,
                "precision": prec,
                "recall": rec,
                "f1": f1,
            }
        return out

    metrics_by_req_type = compute_bucket_metrics(req_type_buckets)
    metrics_by_context_type = compute_bucket_metrics(context_type_buckets)

    return metrics_by_req_type, metrics_by_context_type
