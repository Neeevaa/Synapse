"""
Synapse AI Evaluation Benchmark Seeding Script
Creates a manually curated benchmark dataset labeled:
"DEVELOPMENT DATA - Synapse AI Benchmark Dataset v1 (Not Research Ground Truth)"

Populates test cases covering:
1. Requirement Review (Inconsistency, Ambiguity, Missing Edge Cases, Missing Acceptance Criteria)
2. Meeting Intelligence (Action items, Task suggestions, Summary quality)
3. RAG Groundedness & Retrieval Precision@K, Recall@K, MRR
"""

import os
import sys

# Add backend dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.evaluation import EvaluationDataset, EvaluationCase
from app.models.enums import RequirementType, EvaluationCaseType


def seed_benchmark_dataset(db: Session) -> EvaluationDataset:
    # Check if dataset already exists
    existing = db.query(EvaluationDataset).filter(EvaluationDataset.name.like("%DEVELOPMENT DATA%")).first()
    if existing:
        print(f"[+] Development benchmark dataset already exists: {existing.id}")
        return existing

    dataset = EvaluationDataset(
        name="DEVELOPMENT DATA - Synapse AI Benchmark Dataset v1 (Not Research Ground Truth)",
        description="Development benchmark dataset for Requirement Review, Meeting Intelligence, and RAG context retrieval.",
        version="1.0",
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    benchmark_cases = [
        {
            "case_type": EvaluationCaseType.CONTEXT_RICH,
            "requirement_text": "Tokens must expire in 60 minutes. System shall support user session termination.",
            "requirement_type": RequirementType.FUNCTIONAL,
            "project_context": "[SOURCE: MTG-Security Sync]\nSecurity lead agreed access tokens must expire in 15 minutes with refresh token rotation.",
            "expected_issue_types": ["INCONSISTENCY", "MISSING_ACCEPTANCE_CRITERIA"],
            "expected_severities": ["HIGH", "MEDIUM"],
            "expected_sources": ["MTG-Security Sync"],
            "has_issue": True,
            "ground_truth_notes": "Conflict between 60m spec and 15m meeting decision. Missing criteria for session revocation.",
        },
        {
            "case_type": EvaluationCaseType.CONTEXT_POOR,
            "requirement_text": "The system must process high volumes of financial transactions very quickly.",
            "requirement_type": RequirementType.NON_FUNCTIONAL,
            "project_context": "",
            "expected_issue_types": ["AMBIGUITY", "TESTABILITY"],
            "expected_severities": ["HIGH", "MEDIUM"],
            "expected_sources": [],
            "has_issue": True,
            "ground_truth_notes": "'Very quickly' and 'high volumes' are unmeasurable ambiguous terms.",
        },
        {
            "case_type": EvaluationCaseType.CONTEXT_RICH,
            "requirement_text": "User stories shall be estimated in story points prior to sprint backlog commitment.",
            "requirement_type": RequirementType.USER_STORY,
            "project_context": "[SOURCE: REQ-14 v1]\nSprint backlog items must have explicit estimation and acceptance criteria.\n\n[SOURCE: MTG-Sprint 12 Planning]\nAgreed that tasks without story points cannot enter active sprint.",
            "expected_issue_types": ["MISSING_ACCEPTANCE_CRITERIA"],
            "expected_severities": ["LOW"],
            "expected_sources": ["REQ-14 v1", "MTG-Sprint 12 Planning"],
            "has_issue": True,
            "ground_truth_notes": "Well aligned with project decisions but missing edge case on points re-estimation.",
        },
        {
            "case_type": EvaluationCaseType.CONTEXT_RICH,
            "requirement_text": "Meeting Intelligence module extracts summary, decisions, risks, action items, and task suggestions from transcripts.",
            "requirement_type": RequirementType.FUNCTIONAL,
            "project_context": "[SOURCE: REQ-MEET-01]\nTask suggestions MUST NOT automatically become active tasks. They require human review.\n\n[SOURCE: MTG-Architecture Sync]\nHuman PM can accept, edit, or reject AI task suggestions.",
            "expected_issue_types": ["CONFLICT"],
            "expected_severities": ["CRITICAL"],
            "expected_sources": ["REQ-MEET-01", "MTG-Architecture Sync"],
            "has_issue": False,
            "ground_truth_notes": "Clean requirement properly enforcing Human-in-the-Loop review constraint.",
        },
    ]

    for data in benchmark_cases:
        case = EvaluationCase(
            dataset_id=dataset.id,
            case_type=data["case_type"],
            requirement_text=data["requirement_text"],
            requirement_type=data["requirement_type"],
            project_context=data["project_context"],
            expected_issue_types=data["expected_issue_types"],
            expected_severities=data["expected_severities"],
            expected_sources=data["expected_sources"],
            has_issue=data["has_issue"],
            ground_truth_notes=data["ground_truth_notes"],
        )
        db.add(case)

    db.commit()
    print(f"[+] Successfully seeded development benchmark dataset '{dataset.name}' with {len(benchmark_cases)} cases.")
    return dataset


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_benchmark_dataset(db)
    finally:
        db.close()
