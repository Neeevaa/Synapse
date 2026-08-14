# Synapse AI Evaluation Harness — Research Report

**Dataset**: `DEVELOPMENT DATA - Synapse AI Benchmark Dataset v1 (Not Research Ground Truth)`  
**Generated At**: `2026-08-14T14:18:05.553509+00:00`  
**Evaluation Harness**: Automated Benchmark Execution  
**Disclaimer**: Metrics generated from actual test executions against development benchmark data.

---

## 1. Experimental Conditions Comparison

| Metric | Condition 1: LLM_ONLY | Condition 2: RAG_LLM | Delta / Improvement |
| :--- | :---: | :---: | :---: |
| **Model Name** | `mock-deterministic-v1` | `mock-deterministic-v1` | — |
| **Prompt Version** | `REQUIREMENT_REVIEW_PROMPT_V1` | `REQUIREMENT_REVIEW_PROMPT_V1` | — |
| **Embedding Model** | `None` | `text-embedding-3-small` | — |
| **Precision** | `0.1250` | `0.1250` | `+0.0000` |
| **Recall** | `0.1667` | `0.1667` | `+0.0000` |
| **F1 Score** | `0.1429` | `0.1429` | `+0.0000` |
| **Precision@5** | `0.0000` | `0.7500` | `+0.7500` |
| **Recall@5** | `0.2500` | `1.0000` | `+0.7500` |
| **MRR (Mean Reciprocal Rank)** | `0.0000` | `0.7500` | `+0.7500` |
| **Grounding Rate** | `0.0000` | `0.1250` | `+0.1250` |
| **Avg Retrieval Latency** | `0.00 ms` | `0.24 ms` | — |
| **Avg Generation Latency** | `0.25 ms` | `0.00 ms` | — |
| **Avg Total Latency** | `0.25 ms` | `0.24 ms` | — |

---

## 2. Requirement Review Subgroup Breakdown (RAG_LLM)

### Breakdown by Requirement Type
```json
{
  "FUNCTIONAL": {
    "count": 2,
    "tp": 1,
    "fp": 3,
    "fn": 2,
    "precision": 0.25,
    "recall": 0.3333,
    "f1": 0.2857
  },
  "NON_FUNCTIONAL": {
    "count": 1,
    "tp": 0,
    "fp": 2,
    "fn": 2,
    "precision": 0.0,
    "recall": 0.0,
    "f1": 0.0
  },
  "USER_STORY": {
    "count": 1,
    "tp": 0,
    "fp": 2,
    "fn": 1,
    "precision": 0.0,
    "recall": 0.0,
    "f1": 0.0
  }
}
```

### Breakdown by Context Richness
```json
{
  "CONTEXT_RICH": {
    "count": 3,
    "tp": 1,
    "fp": 5,
    "fn": 3,
    "precision": 0.1667,
    "recall": 0.25,
    "f1": 0.2
  },
  "CONTEXT_POOR": {
    "count": 1,
    "tp": 0,
    "fp": 2,
    "fn": 2,
    "precision": 0.0,
    "recall": 0.0,
    "f1": 0.0
  }
}
```

---

## 3. Human-AI Synergy & Feedback Telemetry

- **Human Acceptance Rate**: `0.00%`
- **Human Modification Rate**: `0.00%`
- **Human Rejection Rate**: `0.00%`

---
*Report saved automatically to `C:\Projects\synapse\project\synapse\backend\reports\evaluation_report_20260814_141805.md`.*
