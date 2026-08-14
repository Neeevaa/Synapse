import time
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.enums import (
    EvaluationCondition,
    EvaluationCaseType,
    RequirementType,
    AIJobStatus,
)
from app.models.evaluation import (
    EvaluationDataset,
    EvaluationCase,
    EvaluationRun,
    EvaluationCaseResult,
)
from app.evaluations.evaluation_schemas import (
    CreateEvaluationDatasetRequest,
    CreateEvaluationCaseRequest,
    CreateEvaluationRunRequest,
)
from app.evaluations.evaluation_repository import EvaluationRepository
from app.evaluations.metrics import (
    calculate_precision,
    calculate_recall,
    calculate_f1,
    calculate_classification_tp_fp_fn,
    calculate_precision_at_k,
    calculate_recall_at_k,
    calculate_mrr,
    calculate_grounding_metrics,
    calculate_human_ai_metrics,
    calculate_subgroup_metrics,
)
from app.ai.llm_provider import get_llm_provider
from app.ai.prompts import REQUIREMENT_REVIEW_PROMPT_V1
from app.requirements.review_schemas import ReviewOutputSchema


class EvaluationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EvaluationRepository(db)
        self.llm_provider = get_llm_provider()

    def create_dataset(self, request: CreateEvaluationDatasetRequest, current_user: User) -> EvaluationDataset:
        dataset = EvaluationDataset(
            name=request.name,
            description=request.description,
            version=request.version,
            created_by=current_user.id,
        )
        return self.repo.create_dataset(dataset)

    def list_datasets(self) -> list[EvaluationDataset]:
        return self.repo.list_datasets()

    def get_dataset(self, dataset_id: UUID) -> EvaluationDataset:
        dataset = self.repo.get_dataset_by_id(dataset_id)
        if not dataset:
            raise ValueError("Evaluation dataset not found.")
        return dataset

    def add_case(self, dataset_id: UUID, request: CreateEvaluationCaseRequest) -> EvaluationCase:
        dataset = self.get_dataset(dataset_id)
        case = EvaluationCase(
            dataset_id=dataset.id,
            case_type=request.case_type,
            requirement_text=request.requirement_text,
            requirement_type=request.requirement_type,
            project_context=request.project_context,
            expected_issue_types=request.expected_issue_types,
            expected_severities=request.expected_severities,
            expected_sources=request.expected_sources,
            has_issue=request.has_issue,
            ground_truth_notes=request.ground_truth_notes,
        )
        return self.repo.create_case(case)

    def list_cases(self, dataset_id: UUID) -> list[EvaluationCase]:
        self.get_dataset(dataset_id)
        return self.repo.list_cases_for_dataset(dataset_id)

    def execute_evaluation_run(self, request: CreateEvaluationRunRequest, current_user: User) -> EvaluationRun:
        dataset = self.get_dataset(request.dataset_id)
        cases = self.repo.list_cases_for_dataset(dataset.id)

        # Enforce input boundaries per EvaluationCondition
        embedding_model = request.embedding_model
        if request.condition == EvaluationCondition.LLM_ONLY:
            embedding_model = None  # Strictly NULL for LLM_ONLY

        run = EvaluationRun(
            dataset_id=dataset.id,
            condition=request.condition,
            model_name=self.llm_provider.get_model_name(),
            prompt_version=request.prompt_version,
            embedding_model=embedding_model,
            retrieval_top_k=request.retrieval_top_k,
            chunk_configuration=request.chunk_configuration,
            status=AIJobStatus.RUNNING,
            configuration_metadata={
                "dataset_name": dataset.name,
                "dataset_version": dataset.version,
                "created_by": str(current_user.id),
                "condition": request.condition.value,
                "chunk_configuration": request.chunk_configuration,
            },
        )
        run = self.repo.create_run(run)

        case_results = []
        tot_tp, tot_fp, tot_fn, tot_tn = 0, 0, 0, 0
        total_p_at_k, total_r_at_k, total_mrr = 0.0, 0.0, 0.0
        total_grounded, total_insufficient = 0, 0
        all_findings_list = []

        total_retrieval_latency = 0.0
        total_generation_latency = 0.0
        total_exec_latency = 0.0

        case_map = {str(c.id): {"requirement_type": c.requirement_type.value, "case_type": c.case_type.value} for c in cases}

        try:
            for case in cases:
                start_case_time = time.time()
                retrieval_latency = 0.0

                # 1. Condition Input Boundary Enforcement
                if request.condition == EvaluationCondition.LLM_ONLY:
                    # LLM receives ONLY target requirement text. No project_context, no retrieval.
                    user_prompt = f"""
TARGET REQUIREMENT TO REVIEW:
{case.requirement_text}

Please perform a structured audit of this requirement.
Return structured JSON output with findings according to the required schema.
"""
                    retrieved_sources = []
                    retrieved_chunk_ids = []
                    similarity_scores = []
                else:
                    # RAG_LLM / RAG_LLM_HUMAN: LLM receives target requirement PLUS retrieved RAG context.
                    start_ret_time = time.time()
                    retrieved_sources = []
                    retrieved_chunk_ids = []
                    similarity_scores = []

                    if case.project_context:
                        # Extract simulated source blocks e.g. [SOURCE: MTG-Security Sync]
                        import re
                        blocks = case.project_context.split("\n\n")
                        for blk in blocks:
                            match = re.search(r"\[SOURCE:\s*([^\]]+)\]", blk)
                            if match:
                                src_name = match.group(1).strip()
                                retrieved_sources.append(src_name)
                                retrieved_chunk_ids.append(f"chunk-{len(retrieved_sources)}")
                                similarity_scores.append(0.85)

                    retrieval_latency = round((time.time() - start_ret_time) * 1000.0, 2)

                    formatted_context = case.project_context if case.project_context else "No project context available."
                    user_prompt = f"""
TARGET REQUIREMENT TO REVIEW:
{case.requirement_text}

RETRIEVED PROJECT KNOWLEDGE CONTEXT:
{formatted_context}

Please perform a structured audit of this requirement version against project context.
Return structured JSON output with findings according to the required schema.
"""

                # 2. Call LLM Provider
                start_gen_time = time.time()
                validated_output, raw_dict = self.llm_provider.generate_structured(
                    prompt=user_prompt,
                    system_instruction=REQUIREMENT_REVIEW_PROMPT_V1,
                    response_schema=ReviewOutputSchema,
                )
                gen_latency = round((time.time() - start_gen_time) * 1000.0, 2)
                case_latency = round((time.time() - start_case_time) * 1000.0, 2)

                total_retrieval_latency += retrieval_latency
                total_generation_latency += gen_latency
                total_exec_latency += case_latency

                # Extract predictions
                predicted_findings_raw = [f.model_dump() for f in validated_output.findings]
                predicted_issues = [f.issue_type.value for f in validated_output.findings]
                predicted_sevs = [f.severity.value for f in validated_output.findings]

                # Compute evidence_status
                case_grounded = 0
                case_insufficient = 0
                for item in predicted_findings_raw:
                    sources = item.get("source_references", [])
                    has_verified = any(
                        s in retrieved_sources or any(s in r or r in s for r in retrieved_sources)
                        for s in sources
                    )
                    if has_verified and request.condition != EvaluationCondition.LLM_ONLY:
                        item["evidence_status"] = "GROUNDED"
                        case_grounded += 1
                    else:
                        item["evidence_status"] = "INSUFFICIENT_CONTEXT"
                        case_insufficient += 1
                        if not item.get("evidence") or "unavailable" in item.get("evidence", "").lower():
                            item["evidence"] = "Supporting project context was unavailable for this finding."

                    item["human_decision"] = "PENDING"
                    all_findings_list.append(item)

                total_grounded += case_grounded
                total_insufficient += case_insufficient

                # 3. Compute Classification Metrics for case
                tp, fp, fn, tn = calculate_classification_tp_fp_fn(
                    expected_labels=case.expected_issue_types,
                    predicted_labels=predicted_issues,
                )
                tot_tp += tp
                tot_fp += fp
                tot_fn += fn
                tot_tn += tn

                # 4. Compute Retrieval Metrics for case
                p_at_k = calculate_precision_at_k(retrieved_sources, case.expected_sources, k=request.retrieval_top_k)
                r_at_k = calculate_recall_at_k(retrieved_sources, case.expected_sources)
                mrr_val = calculate_mrr(retrieved_sources, case.expected_sources)

                total_p_at_k += p_at_k
                total_r_at_k += r_at_k
                total_mrr += mrr_val

                c_res = EvaluationCaseResult(
                    evaluation_run_id=run.id,
                    case_id=case.id,
                    predicted_findings=predicted_findings_raw,
                    predicted_issue_types=predicted_issues,
                    predicted_severities=predicted_sevs,
                    grounded_count=case_grounded,
                    insufficient_context_count=case_insufficient,
                    retrieved_chunk_ids=retrieved_chunk_ids,
                    retrieval_scores=similarity_scores,
                    latency_ms=case_latency,
                    tp=tp,
                    fp=fp,
                    fn=fn,
                    tn=tn,
                    retrieval_precision_at_k=p_at_k,
                    retrieval_recall_at_k=r_at_k,
                    mrr=mrr_val,
                )
                case_results.append(c_res)

            self.repo.create_case_results(case_results)

            # 5. Compute Authoritative Aggregate Metrics
            num_cases = len(cases) if cases else 1
            agg_prec = calculate_precision(tot_tp, tot_fp)
            agg_rec = calculate_recall(tot_tp, tot_fn)
            agg_f1 = calculate_f1(agg_prec, agg_rec)

            agg_p_at_k = round(total_p_at_k / float(num_cases), 4)
            agg_r_at_k = round(total_r_at_k / float(num_cases), 4)
            agg_mrr = round(total_mrr / float(num_cases), 4)

            grounding_metrics = calculate_grounding_metrics(all_findings_list)
            human_metrics = calculate_human_ai_metrics(all_findings_list)

            # Subgroup breakdowns
            raw_case_results = [
                {"case_id": str(r.case_id), "tp": r.tp, "fp": r.fp, "fn": r.fn}
                for r in case_results
            ]
            metrics_by_req_type, metrics_by_context_type = calculate_subgroup_metrics(raw_case_results, case_map)

            # Update Run with Authoritative Aggregate Metrics
            run.status = AIJobStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
            run.aggregate_precision = agg_prec
            run.aggregate_recall = agg_rec
            run.aggregate_f1 = agg_f1
            run.aggregate_precision_at_k = agg_p_at_k
            run.aggregate_recall_at_k = agg_r_at_k
            run.aggregate_mrr = agg_mrr
            run.aggregate_grounding_rate = grounding_metrics["grounded_rate"]
            run.aggregate_insufficient_context_rate = grounding_metrics["insufficient_context_rate"]
            run.aggregate_human_acceptance_rate = human_metrics["acceptance_rate"]
            run.aggregate_human_rejection_rate = human_metrics["rejection_rate"]
            run.aggregate_human_modification_rate = human_metrics["modification_rate"]
            run.avg_retrieval_latency_ms = round(total_retrieval_latency / float(num_cases), 2)
            run.avg_generation_latency_ms = round(total_generation_latency / float(num_cases), 2)
            run.avg_total_latency_ms = round(total_exec_latency / float(num_cases), 2)
            run.metrics_by_requirement_type = metrics_by_req_type
            run.metrics_by_context_type = metrics_by_context_type

            self.repo.update_run(run)
            return self.repo.get_run_by_id(run.id)

        except Exception as err:
            run.status = AIJobStatus.FAILED
            run.completed_at = datetime.now(timezone.utc)
            self.repo.update_run(run)
            raise err

    def list_runs(self, dataset_id: Optional[UUID] = None) -> list[EvaluationRun]:
        return self.repo.list_runs(dataset_id)

    def get_run_detail(self, run_id: UUID) -> EvaluationRun:
        run = self.repo.get_run_id(run_id) if hasattr(self.repo, 'get_run_id') else self.repo.get_run_by_id(run_id)
        if not run:
            raise ValueError("Evaluation run not found.")
        return run
