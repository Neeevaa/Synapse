"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Check,
  X,
  Edit3,
  ExternalLink,
  Layers,
  FileText,
  ShieldAlert,
  HelpCircle,
  UserCheck,
} from "lucide-react";

interface FindingItem {
  id: string;
  review_id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  issue_type: string;
  evidence_status: "GROUNDED" | "INSUFFICIENT_CONTEXT";
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  source_references: string[];
  human_decision: "PENDING" | "ACCEPTED" | "REJECTED" | "MODIFIED";
  human_comment?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

interface RequirementReviewData {
  id: string;
  requirement_id: string;
  requirement_version_id: string;
  project_id: string;
  company_id: string;
  ai_job_id?: string | null;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  model_name: string;
  prompt_version: string;
  retrieval_top_k: number;
  retrieved_chunk_ids?: string[] | null;
  similarity_scores?: number[] | null;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
  findings: FindingItem[];
}

interface RequirementReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  requirementId: string;
  requirementKey: string;
  requirementTitle: string;
  versionNumber: number;
}

export default function RequirementReviewModal({
  isOpen,
  onClose,
  projectId,
  requirementId,
  requirementKey,
  requirementTitle,
  versionNumber,
}: RequirementReviewModalProps) {
  const [review, setReview] = useState<RequirementReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modify State
  const [modifyingFinding, setModifyingFinding] = useState<FindingItem | null>(null);
  const [editRecommendation, setEditRecommendation] = useState("");
  const [editComment, setEditComment] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState<string | null>(null);

  const fetchOrRunReview = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try fetching existing completed review for this requirement
      const listRes = await api.get(`/projects/${projectId}/requirements/${requirementId}/reviews`);
      const existingReviews: RequirementReviewData[] = listRes.data.data || [];

      if (existingReviews.length > 0) {
        setReview(existingReviews[0]);
      } else {
        // 2. Trigger new AI Review
        const postRes = await api.post(`/projects/${projectId}/requirements/${requirementId}/reviews`);
        setReview(postRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to execute AI Requirement Review.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrRunReview();
    } else {
      setReview(null);
      setModifyingFinding(null);
    }
  }, [isOpen, projectId, requirementId]);

  const handleDecision = async (
    findingId: string,
    decision: "ACCEPTED" | "REJECTED" | "MODIFIED",
    comment?: string,
    modifiedRec?: string
  ) => {
    if (!review) return;
    setSubmittingDecision(findingId);
    try {
      const payload = {
        human_decision: decision,
        human_comment: comment || undefined,
        modified_recommendation: modifiedRec || undefined,
      };
      const patchRes = await api.patch(
        `/projects/${projectId}/requirements/${requirementId}/reviews/${review.id}/findings/${findingId}`,
        payload
      );
      const updatedFinding: FindingItem = patchRes.data.data;

      setReview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.map((f) => (f.id === findingId ? updatedFinding : f)),
        };
      });

      if (modifyingFinding?.id === findingId) {
        setModifyingFinding(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update finding decision.");
    } finally {
      setSubmittingDecision(null);
    }
  };

  if (!isOpen) return null;

  const findings = review?.findings || [];
  const criticalHighCount = findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const lowCount = findings.filter((f) => f.severity === "LOW").length;

  const severityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "HIGH":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "MEDIUM":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-[950px] rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {requirementKey}
                </span>
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  v{versionNumber}
                </span>
                <h2 className="text-lg font-bold text-foreground">AI Requirement Review</h2>
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[500px]">
                {requirementTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-purple-500 mx-auto" />
              <p className="text-xs font-semibold text-muted-foreground">
                Analyzing requirement against project knowledge base & RAG context...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="size-4" /> {error}
            </div>
          )}

          {!loading && !error && review && (
            <>
              {/* Summary Stats Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                  <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Findings
                  </span>
                  <div className="text-xl font-extrabold text-foreground">{findings.length}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 shadow-2xs space-y-1">
                  <span className="text-[0.7rem] font-semibold text-rose-500 uppercase tracking-wider">
                    Critical / High
                  </span>
                  <div className="text-xl font-extrabold text-rose-500">{criticalHighCount}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 shadow-2xs space-y-1">
                  <span className="text-[0.7rem] font-semibold text-blue-400 uppercase tracking-wider">
                    Medium
                  </span>
                  <div className="text-xl font-extrabold text-blue-400">{mediumCount}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                  <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">
                    Low
                  </span>
                  <div className="text-xl font-extrabold text-muted-foreground">{lowCount}</div>
                </div>
              </div>

              {/* Findings Cards List */}
              <div className="space-y-5">
                {findings.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                    <CheckCircle2 className="size-8 text-emerald-400 mx-auto" />
                    <p className="font-semibold text-foreground">No requirement issues detected.</p>
                    <p>This requirement version is consistent with current project context.</p>
                  </div>
                ) : (
                  findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4 hover:border-purple-500/30 transition-colors"
                    >
                      {/* Finding Card Top Bar */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md border text-[0.7rem] font-bold uppercase tracking-wider ${severityBadgeClass(
                              f.severity
                            )}`}
                          >
                            {f.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-[0.7rem] font-mono text-muted-foreground">
                            {f.issue_type}
                          </span>

                          {/* Evidence Status Badge */}
                          {f.evidence_status === "GROUNDED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[0.7rem] font-bold">
                              ✓ Grounded in Project Context
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[0.7rem] font-bold">
                              <HelpCircle className="size-3" /> Insufficient Context (Observation)
                            </span>
                          )}

                          {f.human_decision === "MODIFIED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[0.7rem] font-semibold">
                              <UserCheck className="size-3" /> Human Modified
                            </span>
                          )}
                        </div>

                        {/* Decision Status Pill */}
                        <div>
                          {f.human_decision === "ACCEPTED" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                              <Check className="size-3.5" /> Accepted
                            </span>
                          )}
                          {f.human_decision === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                              <X className="size-3.5" /> Rejected
                            </span>
                          )}
                          {f.human_decision === "MODIFIED" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                              <Edit3 className="size-3.5" /> Modified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                      </div>

                      {/* GROUNDED EVIDENCE CARD (Cyan/Slate) */}
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-cyan-400">
                          <Layers className="size-3.5" /> Project Evidence:
                        </div>
                        <p className="text-xs font-mono text-slate-300 leading-relaxed">
                          {f.evidence}
                        </p>
                      </div>

                      {/* AI RECOMMENDATION CARD (Purple) */}
                      <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-purple-300">
                          <Sparkles className="size-3.5 text-purple-400" /> AI Recommendation:
                        </div>
                        <p className="text-xs text-purple-200 leading-relaxed font-medium">
                          {f.recommendation}
                        </p>
                      </div>

                      {/* Verified Source Citations */}
                      {f.source_references && f.source_references.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1">
                          <span className="font-semibold text-foreground">Verified Sources:</span>
                          {f.source_references.map((ref, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted border border-border text-[0.7rem] font-mono text-cyan-400"
                            >
                              <FileText className="size-3" /> {ref}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Human Comment (If modified/accepted/rejected with feedback) */}
                      {f.human_comment && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground italic">
                          "{f.human_comment}"
                        </div>
                      )}

                      {/* Decision Controls Bar */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/50">
                        <button
                          onClick={() => handleDecision(f.id, "ACCEPTED")}
                          disabled={submittingDecision === f.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            f.human_decision === "ACCEPTED"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                          }`}
                        >
                          <Check className="size-3.5" /> Accept
                        </button>

                        <button
                          onClick={() => handleDecision(f.id, "REJECTED")}
                          disabled={submittingDecision === f.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            f.human_decision === "REJECTED"
                              ? "bg-rose-600 text-white"
                              : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                          }`}
                        >
                          <X className="size-3.5" /> Reject
                        </button>

                        <button
                          onClick={() => {
                            setModifyingFinding(f);
                            setEditRecommendation(f.recommendation);
                            setEditComment(f.human_comment || "");
                          }}
                          disabled={submittingDecision === f.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            f.human_decision === "MODIFIED"
                              ? "bg-purple-600 text-white"
                              : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20"
                          }`}
                        >
                          <Edit3 className="size-3.5" /> Modify
                        </button>
                      </div>

                      {/* Modify Form Panel */}
                      {modifyingFinding?.id === f.id && (
                        <div className="mt-3 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Edit3 className="size-3.5 text-purple-400" /> Modify Recommendation & Feedback
                          </h4>
                          <div>
                            <label className="text-[0.7rem] font-semibold text-muted-foreground">
                              Custom Recommendation:
                            </label>
                            <textarea
                              rows={3}
                              value={editRecommendation}
                              onChange={(e) => setEditRecommendation(e.target.value)}
                              className="w-full mt-1 p-2.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="text-[0.7rem] font-semibold text-muted-foreground">
                              Human Feedback Comment (Optional):
                            </label>
                            <input
                              type="text"
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              placeholder="Reason for modification..."
                              className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setModifyingFinding(null)}
                              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDecision(
                                  f.id,
                                  "MODIFIED",
                                  editComment,
                                  editRecommendation
                                )
                              }
                              className="px-4 py-1.5 rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-500 cursor-pointer"
                            >
                              Save Modification
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
