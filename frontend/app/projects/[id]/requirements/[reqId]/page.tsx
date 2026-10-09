"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  FileText,
  History,
  CheckCircle2,
  XCircle,
  Archive,
  Send,
  Edit3,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import TestCaseWorkspace from "@/components/requirements/TestCaseWorkspace";

interface RequirementVersion {
  id: string;
  requirement_id: string;
  version_number: number;
  title: string;
  description: string;
  acceptance_criteria?: string | null;
  requirement_type: string;
  priority: string;
  status: string;
  source: string;
  change_summary?: string | null;
  created_by: string;
  author_name?: string | null;
  created_at: string;
}

interface RequirementDetail {
  id: string;
  project_id: string;
  company_id: string;
  requirement_key: string;
  title: string;
  description: string;
  requirement_type: string;
  priority: string;
  status: string;
  source: string;
  acceptance_criteria?: string | null;
  current_version: number;
  created_by: string;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  versions: RequirementVersion[];
}

export default function RequirementDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const requirementId = params.reqId as string;

  const [project, setProject] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [activeVersion, setActiveVersion] = useState<RequirementVersion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Default to test-cases tab if query param ?tab=test-cases, else overview
  const initialTab = searchParams.get("tab") === "test-cases" ? "test-cases" : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "acceptance" | "test-cases" | "history">(
    initialTab
  );

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

  const fetchRequirement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/requirements/${requirementId}`);
      const data = res.data?.data;
      setRequirement(data);
      if (data?.versions && data.versions.length > 0) {
        setActiveVersion(data.versions[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load requirement details.");
    } finally {
      setLoading(false);
    }
  }, [projectId, requirementId]);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [meRes, projRes] = await Promise.all([
          api.get("/auth/me"),
          api.get(`/projects/${projectId}`),
        ]);
        setUserRole(meRes.data.data.role);
        setProject(projRes.data.data);
      } catch {}
    };
    fetchContext();
    fetchRequirement();
  }, [projectId, fetchRequirement]);

  const handleStatusTransition = async (newStatus: string, defaultSummary: string) => {
    if (!requirement) return;
    setActionLoading(true);
    try {
      const res = await api.patch(
        `/projects/${projectId}/requirements/${requirement.id}/status`,
        {
          status: newStatus,
          change_summary: defaultSummary,
        }
      );
      const updated = res.data.data;
      setRequirement(updated);
      if (updated?.versions && updated.versions.length > 0) {
        setActiveVersion(updated.versions[0]);
      }
      setActionNotice({ message: `Requirement status updated to ${newStatus}.`, type: "success" });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({
        message: err.response?.data?.message || "Status transition failed.",
        type: "error",
      });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "FUNCTIONAL":
        return "bg-primary/15 text-primary border-primary/25";
      case "NON_FUNCTIONAL":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "USER_STORY":
        return "bg-info/15 text-info border-info/25";
      default:
        return "bg-muted/80 text-muted-foreground border-border";
    }
  };

  const getPriorityBadgeStyle = (prio: string) => {
    switch (prio) {
      case "URGENT":
        return "bg-destructive/15 text-destructive border-destructive/30 font-bold";
      case "HIGH":
        return "bg-warning/25 text-warning border-warning/35";
      case "MEDIUM":
        return "bg-warning/15 text-warning border-warning/25";
      case "LOW":
        return "bg-muted/80 text-foreground border-border";
      default:
        return "bg-muted/80 text-foreground border-border";
    }
  };

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case "APPROVED":
        return "bg-primary/15 text-primary border-primary/25";
      case "REVIEW":
        return "bg-warning/15 text-warning border-warning/25";
      case "DRAFT":
        return "bg-muted/80 text-muted-foreground border-border";
      case "REJECTED":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "ARCHIVED":
        return "bg-muted/60 text-muted-foreground/80 border-border";
      default:
        return "bg-muted/80 text-muted-foreground border-border";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const canApprove =
    userRole === "OWNER" || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  return (
    <ProtectedShell>
      <div className="w-full space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${projectId}/requirements`}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Requirements
          </Link>
          <div className="text-xs text-muted-foreground">
            {project?.name && <span className="font-semibold text-foreground">{project.name}</span>}
          </div>
        </div>

        {/* Global Action Notice */}
        {actionNotice && (
          <div
            className={`rounded-xl p-4 text-xs font-medium border flex items-center justify-between ${
              actionNotice.type === "success"
                ? "bg-primary/15 text-primary border-primary/25"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" /> {actionNotice.message}
            </span>
            <button onClick={() => setActionNotice(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground space-y-3 rounded-2xl border border-border bg-card">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading requirement details...</p>
          </div>
        ) : error || !requirement ? (
          <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/10">
            <AlertCircle className="size-8 mx-auto" />
            <p className="text-sm font-semibold">{error || "Requirement not found."}</p>
            <Link
              href={`/projects/${projectId}/requirements`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 px-4 py-2 rounded-xl border border-border transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Return to Requirements List
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Requirement Header */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                    {requirement.requirement_key}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getTypeBadgeStyle(
                      requirement.requirement_type
                    )}`}
                  >
                    {requirement.requirement_type.replace("_", " ")}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getPriorityBadgeStyle(
                      requirement.priority
                    )}`}
                  >
                    {requirement.priority}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeStyle(
                      requirement.status
                    )}`}
                  >
                    {requirement.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-muted text-foreground border border-border">
                    v{activeVersion ? activeVersion.version_number : requirement.current_version}{" "}
                    {activeVersion &&
                      activeVersion.version_number === requirement.current_version &&
                      "(Current)"}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {activeVersion ? activeVersion.title : requirement.title}
                </h1>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab("test-cases")}
                  data-testid="header-generate-test-cases-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/95 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="size-4" /> Generate Test Cases with AI
                </button>
              </div>
            </div>

            {/* Requirement Workspace Tabs */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-6 pt-3 pb-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("overview")}
                  data-testid="tab-overview"
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "overview"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab("acceptance")}
                  data-testid="tab-acceptance"
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "acceptance"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Acceptance Criteria
                </button>

                <button
                  onClick={() => setActiveTab("test-cases")}
                  data-testid="tab-ai-test-cases"
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === "test-cases"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span>AI Test Cases</span>
                </button>

                <button
                  onClick={() => setActiveTab("history")}
                  data-testid="tab-history"
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === "history"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <History className="size-3.5 text-muted-foreground" />
                  <span>History ({requirement.versions?.length || 0})</span>
                </button>
              </div>

              {/* Workspace Content */}
              <div className="p-6">
                {/* 1. AI TEST CASES TAB */}
                {activeTab === "test-cases" && (
                  <TestCaseWorkspace
                    projectId={projectId}
                    requirementId={requirement.id}
                    requirementTitle={activeVersion ? activeVersion.title : requirement.title}
                    userRole={userRole}
                  />
                )}

                {/* 2. OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      {activeVersion &&
                        activeVersion.version_number !== requirement.current_version && (
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <History className="size-4 shrink-0" />
                            <span>
                              Viewing snapshot: <strong>Version {activeVersion.version_number}</strong>{" "}
                              (Created on {formatDate(activeVersion.created_at)})
                            </span>
                          </div>
                        )}

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Description
                        </h4>
                        <div className="rounded-xl border border-border bg-background p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {activeVersion ? activeVersion.description : requirement.description}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Acceptance Criteria Preview
                        </h4>
                        <div className="rounded-xl border border-border bg-background p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {(activeVersion
                            ? activeVersion.acceptance_criteria
                            : requirement.acceptance_criteria) || (
                            <span className="italic text-muted-foreground">
                              No acceptance criteria specified.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
                        <div>
                          <span className="block text-xs text-muted-foreground uppercase font-bold">Source</span>
                          <span className="font-semibold text-foreground">{requirement.source}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground uppercase font-bold">
                            Created By
                          </span>
                          <span className="font-semibold text-foreground">
                            {requirement.creator_name || "Author"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground uppercase font-bold">
                            Created Date
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatDate(requirement.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Requirement Status Actions
                        </h4>
                        <div className="space-y-2">
                          {requirement.status === "DRAFT" && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleStatusTransition("REVIEW", "Submitted for peer review")}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                            >
                              <Send className="size-3.5" /> Submit for Review
                            </button>
                          )}

                          {canApprove &&
                            (requirement.status === "REVIEW" || requirement.status === "DRAFT") && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  disabled={actionLoading}
                                  onClick={() =>
                                    handleStatusTransition("APPROVED", "Approved by Project Manager")
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/95 px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="size-3.5" /> Approve
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() =>
                                    handleStatusTransition("REJECTED", "Rejected during review")
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive hover:bg-destructive/90 px-3 py-2 text-xs font-semibold text-destructive-foreground transition-colors cursor-pointer"
                                >
                                  <XCircle className="size-3.5" /> Reject
                                </button>
                              </div>
                            )}

                          {requirement.status !== "ARCHIVED" && canApprove && (
                            <button
                              disabled={actionLoading}
                              onClick={() =>
                                handleStatusTransition("ARCHIVED", "Archived requirement")
                              }
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted hover:bg-muted/80 px-3 py-2 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                            >
                              <Archive className="size-3.5" /> Archive Requirement
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ACCEPTANCE CRITERIA TAB */}
                {activeTab === "acceptance" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Detailed Acceptance Criteria
                      </h4>
                      <button
                        onClick={() => setActiveTab("test-cases")}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold cursor-pointer"
                      >
                        <Sparkles className="size-3.5" /> Convert into Test Cases
                      </button>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {(activeVersion
                        ? activeVersion.acceptance_criteria
                        : requirement.acceptance_criteria) || (
                        <div className="text-muted-foreground italic py-4 text-center">
                          No acceptance criteria specified for this requirement version.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. HISTORY TAB */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <History className="size-3.5 text-primary" /> Version History
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {requirement.versions?.length || 0} versions recorded
                      </span>
                    </div>

                    <div className="space-y-3">
                      {requirement.versions?.map((ver) => {
                        const isSelected = activeVersion?.id === ver.id;
                        const isCurrent = ver.version_number === requirement.current_version;
                        return (
                          <div
                            key={ver.id}
                            onClick={() => setActiveVersion(ver)}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary/10 border-primary/40 text-foreground"
                                : "bg-card border-border text-foreground hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-primary flex items-center gap-2">
                                Version {ver.version_number}{" "}
                                {isCurrent && (
                                  <span className="text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                    Current
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(ver.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-foreground mt-2 font-medium">
                              {ver.change_summary || "Requirement update"}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Author: {ver.author_name || "Author"}</span>
                              <span className="uppercase font-semibold">{ver.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
