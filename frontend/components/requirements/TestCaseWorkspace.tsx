"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Loader2,
  AlertCircle,
  Layers,
  Check,
  X,
  FileCheck2,
  ListOrdered,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";

export interface TestStep {
  step: number;
  action: string;
  expected_result: string;
}

export interface TestCaseItem {
  id: string;
  company_id: string;
  project_id: string;
  requirement_id: string;
  title: string;
  description: string;
  category: "FUNCTIONAL" | "NEGATIVE" | "BOUNDARY" | "ACCEPTANCE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "DRAFT" | "APPROVED" | "REJECTED";
  source: "AI_GENERATED" | "MANUAL";
  preconditions?: string | null;
  test_steps: TestStep[];
  expected_result: string;
  test_data?: string | null;
  generation_metadata?: any;
  created_by: string;
  creator_name?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface TestCaseWorkspaceProps {
  projectId: string;
  requirementId: string;
  requirementTitle: string;
  userRole?: string;
  onTestCasesCountChange?: (count: number) => void;
}

const GENERATION_STAGES = [
  "Analyzing requirement...",
  "Preparing project context...",
  "Generating test scenarios...",
  "Validating test coverage...",
  "Saving draft test cases...",
];

export default function TestCaseWorkspace({
  projectId,
  requirementId,
  requirementTitle,
  userRole = "MEMBER",
  onTestCasesCountChange,
}: TestCaseWorkspaceProps) {
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({
    DRAFT: 0,
    APPROVED: 0,
    REJECTED: 0,
  });
  const [countsByCategory, setCountsByCategory] = useState<Record<string, number>>({
    FUNCTIONAL: 0,
    NEGATIVE: 0,
    BOUNDARY: 0,
    ACCEPTANCE: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string>(GENERATION_STAGES[0]);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Edit Drawer State
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingCase, setEditingCase] = useState<TestCaseItem | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCategory, setEditCategory] = useState<"FUNCTIONAL" | "NEGATIVE" | "BOUNDARY" | "ACCEPTANCE">("FUNCTIONAL");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editPreconditions, setEditPreconditions] = useState<string>("");
  const [editExpectedResult, setEditExpectedResult] = useState<string>("");
  const [editTestData, setEditTestData] = useState<string>("");
  const [editSteps, setEditSteps] = useState<TestStep[]>([]);

  // Action states for individual cases
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch Test Cases
  const fetchTestCases = useCallback(async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const res = await api.get(`/projects/${projectId}/requirements/${requirementId}/test-cases`);
      const data = res.data?.data;
      if (data) {
        setTestCases(data.items || []);
        setCountsByStatus(data.counts_by_status || { DRAFT: 0, APPROVED: 0, REJECTED: 0 });
        setCountsByCategory(
          data.counts_by_category || { FUNCTIONAL: 0, NEGATIVE: 0, BOUNDARY: 0, ACCEPTANCE: 0 }
        );
        if (onTestCasesCountChange) {
          onTestCasesCountChange(data.total || 0);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to load test cases.";
      setErrorNotice(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, requirementId, onTestCasesCountChange]);

  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

  // AI Generation Trigger
  const handleGenerate = async () => {
    setGenerating(true);
    setErrorNotice(null);
    setSuccessNotice(null);
    setGenerationStage(GENERATION_STAGES[0]);

    // Advance stages over actual request life
    let stageIndex = 0;
    const interval = setInterval(() => {
      stageIndex = (stageIndex + 1) % GENERATION_STAGES.length;
      setGenerationStage(GENERATION_STAGES[stageIndex]);
    }, 1800);

    try {
      const res = await api.post(
        `/projects/${projectId}/requirements/${requirementId}/test-cases/generate`
      );
      clearInterval(interval);
      setSuccessNotice("Test cases generated successfully.");
      await fetchTestCases();
    } catch (err: any) {
      clearInterval(interval);
      const msg = err.response?.data?.message || err.message || "Failed to generate test cases.";
      setErrorNotice(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Open Edit Side Drawer
  const handleOpenEdit = (tc: TestCaseItem) => {
    setEditingCase(tc);
    setEditTitle(tc.title);
    setEditDescription(tc.description);
    setEditCategory(tc.category);
    setEditPriority(tc.priority);
    setEditPreconditions(tc.preconditions || "");
    setEditExpectedResult(tc.expected_result);
    setEditTestData(tc.test_data || "");
    setEditSteps(
      tc.test_steps && tc.test_steps.length > 0
        ? JSON.parse(JSON.stringify(tc.test_steps))
        : [{ step: 1, action: "", expected_result: "" }]
    );
    setEditError(null);
    setDrawerOpen(true);
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!editingCase) return;
    if (!editTitle.trim()) {
      setEditError("Test case title cannot be empty.");
      return;
    }
    if (!editExpectedResult.trim()) {
      setEditError("Expected result cannot be empty.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    const payload = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      category: editCategory,
      priority: editPriority,
      preconditions: editPreconditions.trim() || null,
      expected_result: editExpectedResult.trim(),
      test_data: editTestData.trim() || null,
      test_steps: editSteps.filter((s) => s.action.trim() || s.expected_result.trim()),
    };

    try {
      await api.patch(`/projects/${projectId}/test-cases/${editingCase.id}`, payload);
      setDrawerOpen(false);
      setEditingCase(null);
      setSuccessNotice("Test case updated successfully (remains Draft).");
      await fetchTestCases();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save test case.";
      setEditError(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  // Approve Test Case
  const handleApprove = async (tc: TestCaseItem) => {
    setActionLoadingId(tc.id);
    setErrorNotice(null);
    try {
      await api.post(`/projects/${projectId}/test-cases/${tc.id}/approve`);
      setSuccessNotice(`Approved test case: ${tc.title}`);
      await fetchTestCases();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to approve test case.";
      setErrorNotice(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Test Case
  const handleReject = async (tc: TestCaseItem) => {
    setActionLoadingId(tc.id);
    setErrorNotice(null);
    try {
      await api.post(`/projects/${projectId}/test-cases/${tc.id}/reject`);
      setSuccessNotice(`Rejected test case: ${tc.title}`);
      await fetchTestCases();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to reject test case.";
      setErrorNotice(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter test cases by active category tab
  const filteredCases =
    activeCategory === "ALL"
      ? testCases
      : testCases.filter((tc) => tc.category === activeCategory);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "FUNCTIONAL":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "NEGATIVE":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "BOUNDARY":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "ACCEPTANCE":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case "URGENT":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
      case "MEDIUM":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
      case "LOW":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold";
      case "DRAFT":
      default:
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold";
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorNotice && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-rose-500" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="size-4 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-foreground tracking-tight">AI Test Cases</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate and review test cases from this requirement.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          data-testid="generate-test-cases-btn"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin text-white" />
              <span>Generating Test Cases...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4 text-emerald-200" />
              <span>Generate Test Cases</span>
            </>
          )}
        </button>
      </div>

      {/* Generation Loading State */}
      {generating && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3 animate-pulse">
          <Loader2 className="size-8 animate-spin text-emerald-500 mx-auto" />
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{generationStage}</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Synthesizing requirement rules, acceptance criteria, and project context into verifiable test scenarios.
          </p>
        </div>
      )}

      {/* Stat Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Test Cases
          </span>
          <div className="text-xl font-bold text-foreground" data-testid="count-total">
            {testCases.length}
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Draft
          </span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="count-draft">
            {countsByStatus.DRAFT || 0}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Approved
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="count-approved">
            {countsByStatus.APPROVED || 0}
          </div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-1">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Rejected
          </span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400" data-testid="count-rejected">
            {countsByStatus.REJECTED || 0}
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveCategory("ALL")}
          data-testid="tab-category-all"
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
            activeCategory === "ALL"
              ? "bg-muted text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>All</span>
          <span className="rounded-full bg-card border border-border px-1.5 py-0.2 text-[10px] text-muted-foreground">
            {testCases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("FUNCTIONAL")}
          data-testid="tab-category-functional"
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
            activeCategory === "FUNCTIONAL"
              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Functional</span>
          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.2 text-[10px] text-blue-600 dark:text-blue-400">
            {countsByCategory.FUNCTIONAL || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("NEGATIVE")}
          data-testid="tab-category-negative"
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
            activeCategory === "NEGATIVE"
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Negative</span>
          <span className="rounded-full bg-rose-500/10 px-1.5 py-0.2 text-[10px] text-rose-600 dark:text-rose-400">
            {countsByCategory.NEGATIVE || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("BOUNDARY")}
          data-testid="tab-category-boundary"
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
            activeCategory === "BOUNDARY"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Boundary</span>
          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] text-amber-600 dark:text-amber-400">
            {countsByCategory.BOUNDARY || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory("ACCEPTANCE")}
          data-testid="tab-category-acceptance"
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
            activeCategory === "ACCEPTANCE"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Acceptance</span>
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] text-emerald-600 dark:text-emerald-400">
            {countsByCategory.ACCEPTANCE || 0}
          </span>
        </button>
      </div>

      {/* Test Case Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
          <p className="text-xs font-medium">Loading test cases...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <FileCheck2 className="size-10 mx-auto text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">No test cases found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {testCases.length === 0
              ? "No test cases have been generated for this requirement yet. Click 'Generate Test Cases' to create them."
              : `No ${activeCategory.toLowerCase()} test cases found.`}
          </p>
          {testCases.length === 0 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 cursor-pointer"
            >
              <Sparkles className="size-3.5" /> Generate Test Cases
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4" data-testid="test-cases-list">
          {filteredCases.map((tc) => (
            <div
              key={tc.id}
              data-testid={`test-case-card-${tc.id}`}
              className="rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all space-y-4 hover:border-muted-foreground/30"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-full border font-semibold ${getCategoryBadge(
                        tc.category
                      )}`}
                    >
                      {tc.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border font-semibold ${getPriorityBadge(
                        tc.priority
                      )}`}
                    >
                      {tc.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border ${getStatusBadge(tc.status)}`}
                      data-testid={`test-case-status-${tc.id}`}
                    >
                      {tc.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">
                      {tc.source === "AI_GENERATED" ? "AI Generated" : "Manual"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground pt-0.5 leading-snug">{tc.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tc.description}</p>
                </div>

                {/* Actions: Edit, Approve, Reject */}
                <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                  <button
                    onClick={() => handleOpenEdit(tc)}
                    data-testid={`edit-btn-${tc.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </button>

                  <button
                    onClick={() => handleApprove(tc)}
                    disabled={tc.status === "APPROVED" || actionLoadingId === tc.id}
                    data-testid={`approve-btn-${tc.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      tc.status === "APPROVED"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 opacity-50 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    <Check className="size-3.5" /> Approve
                  </button>

                  <button
                    onClick={() => handleReject(tc)}
                    disabled={tc.status === "REJECTED" || actionLoadingId === tc.id}
                    data-testid={`reject-btn-${tc.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      tc.status === "REJECTED"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 opacity-50 cursor-not-allowed"
                        : "bg-rose-600 hover:bg-rose-500 text-white"
                    }`}
                  >
                    <X className="size-3.5" /> Reject
                  </button>
                </div>
              </div>

              {/* Preconditions & Test Data */}
              {(tc.preconditions || tc.test_data) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border">
                  {tc.preconditions && (
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
                        Preconditions
                      </span>
                      <p className="text-foreground">{tc.preconditions}</p>
                    </div>
                  )}
                  {tc.test_data && (
                    <div>
                      <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
                        Test Data
                      </span>
                      <p className="font-mono text-[11px] text-foreground break-all">{tc.test_data}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ordered Test Steps */}
              {tc.test_steps && tc.test_steps.length > 0 && (
                <div className="space-y-2">
                  <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                    Execution Steps ({tc.test_steps.length})
                  </span>
                  <div className="rounded-xl border border-border bg-muted/10 overflow-hidden divide-y divide-border text-xs">
                    {tc.test_steps.map((st, idx) => (
                      <div key={idx} className="p-3 flex items-start gap-3">
                        <span className="size-5 rounded-full bg-muted text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {st.step || idx + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Action</span>
                            <span className="text-foreground">{st.action}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Expected Result</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{st.expected_result}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Expected Result */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px] uppercase tracking-wider mb-1">
                  Expected Result
                </span>
                <p className="text-foreground">{tc.expected_result}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT SIDE DRAWER (One Single Slide-Over Panel, No Nested Modals!) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="relative w-screen max-w-xl bg-card border-l border-border text-foreground shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Test Case</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modifications will be saved with status DRAFT.
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Error Notice */}
              {editError && (
                <div className="m-6 mb-0 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-rose-500" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    data-testid="drawer-input-title"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    placeholder="Test case title..."
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as any)}
                      data-testid="drawer-select-category"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="FUNCTIONAL">Functional</option>
                      <option value="NEGATIVE">Negative</option>
                      <option value="BOUNDARY">Boundary</option>
                      <option value="ACCEPTANCE">Acceptance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Priority
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      data-testid="drawer-select-priority"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    data-testid="drawer-input-description"
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none leading-relaxed"
                    placeholder="Summary of what is validated..."
                  />
                </div>

                {/* Preconditions */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Preconditions
                  </label>
                  <textarea
                    rows={2}
                    value={editPreconditions}
                    onChange={(e) => setEditPreconditions(e.target.value)}
                    data-testid="drawer-input-preconditions"
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none leading-relaxed"
                    placeholder="System state or user roles required..."
                  />
                </div>

                {/* Test Data */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Test Data
                  </label>
                  <input
                    type="text"
                    value={editTestData}
                    onChange={(e) => setEditTestData(e.target.value)}
                    data-testid="drawer-input-test-data"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. valid_email='user@domain.com', pin='1234'"
                  />
                </div>

                {/* Expected Result */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Expected Result *
                  </label>
                  <textarea
                    rows={3}
                    value={editExpectedResult}
                    onChange={(e) => setEditExpectedResult(e.target.value)}
                    data-testid="drawer-input-expected-result"
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none leading-relaxed"
                    placeholder="Overall expected outcome..."
                  />
                </div>

                {/* Test Steps Management */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Test Steps ({editSteps.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditSteps([
                          ...editSteps,
                          { step: editSteps.length + 1, action: "", expected_result: "" },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Step
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editSteps.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                          <span>Step {sIdx + 1}</span>
                          {editSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editSteps
                                  .filter((_, i) => i !== sIdx)
                                  .map((s, i) => ({ ...s, step: i + 1 }));
                                setEditSteps(updated);
                              }}
                              className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Action to perform..."
                          value={st.action}
                          onChange={(e) => {
                            const updated = [...editSteps];
                            updated[sIdx].action = e.target.value;
                            setEditSteps(updated);
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                        />

                        <input
                          type="text"
                          placeholder="Expected result for this step..."
                          value={st.expected_result}
                          onChange={(e) => {
                            const updated = [...editSteps];
                            updated[sIdx].expected_result = e.target.value;
                            setEditSteps(updated);
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-300 placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  disabled={savingEdit}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  data-testid="drawer-save-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
