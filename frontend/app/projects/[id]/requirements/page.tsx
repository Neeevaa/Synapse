"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  Archive,
  Send,
  Edit3,
  Check,
  ChevronRight,
  User as UserIcon,
  Calendar,
  Layers,
  X,
  BookOpen,
  Sparkles,
} from "lucide-react";
import RequirementReviewModal from "@/components/requirements/RequirementReviewModal";
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

interface RequirementItem {
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

export default function RequirementsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);

  // Detail Drawer & Version Inspector State
  const [selectedReq, setSelectedReq] = useState<RequirementItem | null>(null);
  const [activeVersion, setActiveVersion] = useState<RequirementVersion | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "acceptance" | "test-cases" | "history">("overview");
  const [reviewModalReq, setReviewModalReq] = useState<RequirementItem | null>(null);


  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createType, setCreateType] = useState<string>("FUNCTIONAL");
  const [createPriority, setCreatePriority] = useState<string>("MEDIUM");
  const [createSource, setCreateSource] = useState<string>("MANUAL_ENTRY");
  const [createCriteria, setCreateCriteria] = useState<string>("");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editType, setEditType] = useState<string>("FUNCTIONAL");
  const [editPriority, setEditPriority] = useState<string>("MEDIUM");
  const [editSource, setEditSource] = useState<string>("MANUAL_ENTRY");
  const [editCriteria, setEditCriteria] = useState<string>("");
  const [editChangeSummary, setEditChangeSummary] = useState<string>("");

  // Action Loading
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Permission Checks
  const canApprove = userRole === "OWNER" || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  const fetchProjectDetail = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.data);
    } catch {
      // Ignore background error
    }
  }, [projectId]);

  const fetchRequirements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter !== "ALL") queryParams.append("requirement_type", typeFilter);
      if (priorityFilter !== "ALL") queryParams.append("priority", priorityFilter);
      if (statusFilter !== "ALL") queryParams.append("status", statusFilter);
      if (searchKeyword.trim()) queryParams.append("keyword", searchKeyword.trim());
      queryParams.append("page", page.toString());
      queryParams.append("page_size", "20");

      const res = await api.get(`/projects/${projectId}/requirements?${queryParams.toString()}`);
      setRequirements(res.data.data.requirements || []);
      setTotalCount(res.data.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load project requirements.");
    } finally {
      setLoading(false);
    }
  }, [projectId, typeFilter, priorityFilter, statusFilter, searchKeyword, page]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserRole(res.data.data.role);
        setCurrentUserId(res.data.data.id);
      } catch {}
    };
    fetchUser();
    fetchProjectDetail();
  }, [fetchProjectDetail]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const handleOpenDetail = (
    req: RequirementItem,
    initialTab: "overview" | "acceptance" | "test-cases" | "history" = "overview"
  ) => {
    setSelectedReq(req);
    setActiveDetailTab(initialTab);
    // Set latest version as default active view
    const latestVer = req.versions && req.versions.length > 0 ? req.versions[0] : null;
    setActiveVersion(latestVer);
  };


  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !createDescription.trim()) {
      setCreateError("Title and description are required.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await api.post(`/projects/${projectId}/requirements`, {
        title: createTitle.trim(),
        description: createDescription.trim(),
        requirement_type: createType,
        priority: createPriority,
        source: createSource,
        acceptance_criteria: createCriteria.trim() || null,
      });

      setCreateModalOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateCriteria("");
      setCreateType("FUNCTIONAL");
      setCreatePriority("MEDIUM");
      setCreateSource("MANUAL_ENTRY");
      fetchRequirements();
      setActionNotice({ message: "Requirement created successfully with Version 1.", type: "success" });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to create requirement.");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (req: RequirementItem) => {
    setSelectedReq(req);
    setEditTitle(req.title);
    setEditDescription(req.description);
    setEditType(req.requirement_type);
    setEditPriority(req.priority);
    setEditSource(req.source);
    setEditCriteria(req.acceptance_criteria || "");
    setEditChangeSummary("");
    setEditModalOpen(true);
  };

  const handleUpdateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setUpdating(true);
    setEditError(null);
    try {
      const res = await api.put(`/projects/${projectId}/requirements/${selectedReq.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        requirement_type: editType,
        priority: editPriority,
        source: editSource,
        acceptance_criteria: editCriteria.trim() || null,
        change_summary: editChangeSummary.trim() || "Requirement update",
      });

      const updated = res.data.data;
      setEditModalOpen(false);
      setSelectedReq(updated);
      const latestVer = updated.versions && updated.versions.length > 0 ? updated.versions[0] : null;
      setActiveVersion(latestVer);
      fetchRequirements();
      setActionNotice({ message: `Requirement updated to Version ${updated.current_version}.`, type: "success" });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Failed to update requirement.");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusTransition = async (newStatus: string, defaultSummary: string) => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/projects/${projectId}/requirements/${selectedReq.id}/status`, {
        status: newStatus,
        change_summary: defaultSummary,
      });

      const updated = res.data.data;
      setSelectedReq(updated);
      const latestVer = updated.versions && updated.versions.length > 0 ? updated.versions[0] : null;
      setActiveVersion(latestVer);
      fetchRequirements();
      setActionNotice({ message: `Requirement status updated to ${newStatus}.`, type: "success" });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice({ message: err.response?.data?.message || "Status transition failed.", type: "error" });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "FUNCTIONAL":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "NON_FUNCTIONAL":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "USER_STORY":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityBadgeStyle = (prio: string) => {
    switch (prio) {
      case "URGENT":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
      case "MEDIUM":
        return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
      case "LOW":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case "APPROVED":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "REVIEW":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "DRAFT":
        return "bg-muted text-muted-foreground border-border";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "ARCHIVED":
        return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
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

  return (
    <ProtectedShell>
      <div className="w-full space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Project Overview
          </Link>
          <div className="text-xs text-muted-foreground">
            {project?.name && <span className="font-semibold text-foreground">{project.name}</span>}
          </div>
        </div>

        {/* Banner Header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FileText className="size-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">Requirements Management</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {totalCount} Total
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Structured, versioned software requirements for traceability, review, and AI synthesis
              </p>
            </div>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 cursor-pointer shrink-0"
          >
            <Plus className="size-4" /> New Requirement
          </button>
        </div>

        {/* Global Action Notice */}
        {actionNotice && (
          <div
            className={`rounded-xl p-4 text-xs font-medium border flex items-center justify-between ${
              actionNotice.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
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

        {/* Requirements Status Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Catalog
            </span>
            <div className="text-xl font-extrabold text-foreground">{totalCount}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Approved
            </span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {requirements.filter((r) => r.status === "APPROVED").length}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              In Review
            </span>
            <div className="text-xl font-extrabold text-primary">
              {requirements.filter((r) => r.status === "REVIEW").length}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Draft / Other
            </span>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {requirements.filter((r) => r.status !== "APPROVED" && r.status !== "REVIEW").length}
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title, key, or criteria..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="FUNCTIONAL">Functional</option>
                <option value="NON_FUNCTIONAL">Non-Functional</option>
                <option value="USER_STORY">User Story</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requirements Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
              <p className="text-xs font-medium">Loading project requirements...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 space-y-2">
              <AlertCircle className="size-8 mx-auto" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : requirements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <BookOpen className="size-10 mx-auto text-muted-foreground/60" />
              <h3 className="text-sm font-semibold text-foreground">No requirements found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No software requirements match your active filter criteria. Click "New Requirement" to create one.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 cursor-pointer"
              >
                <Plus className="size-3.5" /> Create Requirement
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Key</th>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4">Updated</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requirements.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => handleOpenDetail(req)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{req.requirement_key}</td>
                      <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-primary transition-colors max-w-xs md:max-w-sm lg:max-w-md xl:max-w-xl truncate" title={req.title}>
                        {req.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getTypeBadgeStyle(req.requirement_type)}`}>
                          {req.requirement_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getPriorityBadgeStyle(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusBadgeStyle(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-bold border border-border text-foreground">
                          <History className="size-3 text-muted-foreground" /> v{req.current_version}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{formatDate(req.updated_at)}</td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(req, "test-cases")}
                          data-testid={`row-ai-test-cases-btn-${req.id}`}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors mr-2 cursor-pointer"
                        >
                          <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" /> AI Test Cases
                        </button>
                        <button
                          onClick={() => setReviewModalReq(req)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors mr-2 cursor-pointer"
                        >
                          <Sparkles className="size-3 text-primary" /> Review with AI
                        </button>
                        <button
                          onClick={() => handleOpenDetail(req, "overview")}
                          className="inline-flex items-center gap-1 text-xs text-foreground hover:bg-muted/80 font-medium px-2.5 py-1 rounded bg-muted border border-border transition-colors mr-2 cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleOpenEdit(req)}
                          className="inline-flex items-center gap-1 text-xs text-foreground hover:bg-muted/80 font-medium px-2 py-1 rounded bg-muted border border-border transition-colors cursor-pointer"
                        >
                          <Edit3 className="size-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REQUIREMENT DETAIL & TEST CASE WORKSPACE */}
        {selectedReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs">
            <div className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl border border-border bg-card text-foreground shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      {selectedReq.requirement_key}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getTypeBadgeStyle(selectedReq.requirement_type)}`}>
                      {selectedReq.requirement_type.replace("_", " ")}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getPriorityBadgeStyle(selectedReq.priority)}`}>
                      {selectedReq.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeStyle(selectedReq.status)}`}>
                      {selectedReq.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-muted text-foreground border border-border">
                      v{activeVersion ? activeVersion.version_number : selectedReq.current_version}{" "}
                      {activeVersion && activeVersion.version_number === selectedReq.current_version && "(Current)"}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground pt-1">{activeVersion ? activeVersion.title : selectedReq.title}</h2>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveDetailTab("test-cases")}
                    data-testid="header-generate-test-cases-btn"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="size-3.5" /> Generate Test Cases with AI
                  </button>

                  <button
                    onClick={() => handleOpenEdit(selectedReq)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </button>

                  <button
                    onClick={() => setSelectedReq(null)}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Requirement Workspace Tabs */}
              <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-6 pt-2 pb-0">
                <button
                  onClick={() => setActiveDetailTab("overview")}
                  data-testid="tab-overview"
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeDetailTab === "overview"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Overview
                </button>

                <button
                  onClick={() => setActiveDetailTab("acceptance")}
                  data-testid="tab-acceptance"
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeDetailTab === "acceptance"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Acceptance Criteria
                </button>

                <button
                  onClick={() => setActiveDetailTab("test-cases")}
                  data-testid="tab-ai-test-cases"
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeDetailTab === "test-cases"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>AI Test Cases</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab("history")}
                  data-testid="tab-history"
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                    activeDetailTab === "history"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <History className="size-3.5 text-muted-foreground" />
                  <span>History ({selectedReq.versions.length})</span>
                </button>
              </div>

              {/* Tab Workspace Panels */}
              <div className="flex-1 overflow-y-auto">
                {/* 1. AI TEST CASES WORKSPACE */}
                {activeDetailTab === "test-cases" && (
                  <div className="p-6">
                    <TestCaseWorkspace
                      projectId={projectId}
                      requirementId={selectedReq.id}
                      requirementTitle={activeVersion ? activeVersion.title : selectedReq.title}
                      userRole={userRole}
                    />
                  </div>
                )}

                {/* 2. OVERVIEW TAB */}
                {activeDetailTab === "overview" && (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      {activeVersion && activeVersion.version_number !== selectedReq.current_version && (
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <History className="size-4 shrink-0" />
                          <span>
                            Viewing historical snapshot: <strong>Version {activeVersion.version_number}</strong> (Created on {formatDate(activeVersion.created_at)})
                          </span>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                        <div className="rounded-xl border border-border bg-background p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {activeVersion ? activeVersion.description : selectedReq.description}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Acceptance Criteria Preview</h4>
                        <div className="rounded-xl border border-border bg-background p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {(activeVersion ? activeVersion.acceptance_criteria : selectedReq.acceptance_criteria) || (
                            <span className="italic text-muted-foreground">No acceptance criteria specified.</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                        <div>
                          <span className="block text-xs text-muted-foreground uppercase font-bold">Source</span>
                          <span className="font-semibold text-foreground">{selectedReq.source}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground uppercase font-bold">Created By</span>
                          <span className="font-semibold text-foreground">{selectedReq.creator_name || "Author"}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-muted-foreground uppercase font-bold">Created Date</span>
                          <span className="font-semibold text-foreground">{formatDate(selectedReq.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requirement Actions</h4>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleOpenEdit(selectedReq)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted hover:bg-muted/80 px-3 py-2 text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
                          >
                            <Edit3 className="size-3.5" /> Edit Requirement
                          </button>

                          {selectedReq.status === "DRAFT" && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleStatusTransition("REVIEW", "Submitted for peer review")}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                            >
                              <Send className="size-3.5" /> Submit for Review
                            </button>
                          )}

                          {canApprove && (selectedReq.status === "REVIEW" || selectedReq.status === "DRAFT") && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                disabled={actionLoading}
                                onClick={() => handleStatusTransition("APPROVED", "Approved by Project Manager")}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="size-3.5" /> Approve
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleStatusTransition("REJECTED", "Rejected during review")}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                              >
                                <XCircle className="size-3.5" /> Reject
                              </button>
                            </div>
                          )}

                          {selectedReq.status !== "ARCHIVED" && canApprove && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleStatusTransition("ARCHIVED", "Archived requirement")}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-background hover:bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
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
                {activeDetailTab === "acceptance" && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Detailed Acceptance Criteria
                      </h4>
                      <button
                        onClick={() => setActiveDetailTab("test-cases")}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold cursor-pointer"
                      >
                        <Sparkles className="size-3.5" /> Convert to Test Cases
                      </button>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {(activeVersion ? activeVersion.acceptance_criteria : selectedReq.acceptance_criteria) || (
                        <div className="text-muted-foreground italic py-4 text-center">
                          No acceptance criteria specified for this requirement version.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. HISTORY TAB */}
                {activeDetailTab === "history" && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <History className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Version History
                      </h4>
                      <span className="text-[11px] text-muted-foreground">{selectedReq.versions.length} versions recorded</span>
                    </div>

                    <div className="space-y-3">
                      {selectedReq.versions.map((ver) => {
                        const isSelected = activeVersion?.id === ver.id;
                        const isCurrent = ver.version_number === selectedReq.current_version;
                        return (
                          <div
                            key={ver.id}
                            onClick={() => setActiveVersion(ver)}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                                : "bg-card border-border text-foreground hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                Version {ver.version_number}{" "}
                                {isCurrent && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Current
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{formatDate(ver.created_at)}</span>
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


        {/* CREATE REQUIREMENT MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card text-foreground shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="size-5 text-emerald-500" /> New Requirement
                </h3>
                <button onClick={() => setCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              {createError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" /> {createError}
                </div>
              )}

              <form onSubmit={handleCreateRequirement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Requirement Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Multi-factor Authentication Support"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Type</label>
                    <select
                      value={createType}
                      onChange={(e) => setCreateType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="FUNCTIONAL">Functional</option>
                      <option value="NON_FUNCTIONAL">Non-Functional</option>
                      <option value="USER_STORY">User Story</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                    <select
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Source</label>
                    <select
                      value={createSource}
                      onChange={(e) => setCreateSource(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="MANUAL_ENTRY">Manual Entry</option>
                      <option value="SRS">SRS Document</option>
                      <option value="USER_STORY">User Story</option>
                      <option value="MEETING">Meeting Notes</option>
                      <option value="IMPORTED_DOCUMENT">Imported Doc</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Description *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Detailed explanation of system behavior and requirements..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Acceptance Criteria</label>
                  <textarea
                    rows={3}
                    placeholder="1. User receives SMS TOTP code&#10;2. Code expires after 3 minutes"
                    value={createCriteria}
                    onChange={(e) => setCreateCriteria(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    {creating && <Loader2 className="size-3.5 animate-spin" />} Create Requirement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT REQUIREMENT MODAL (Creates New Version) */}
        {editModalOpen && selectedReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card text-foreground shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="size-5 text-emerald-500" /> Edit Requirement ({selectedReq.requirement_key})
                </h3>
                <button onClick={() => setEditModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <History className="size-4 shrink-0" />
                <span>Saving edits will automatically increment the version to <strong>Version {selectedReq.current_version + 1}</strong>. Historical versions will be preserved.</span>
              </div>

              {editError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" /> {editError}
                </div>
              )}

              <form onSubmit={handleUpdateRequirement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Requirement Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="FUNCTIONAL">Functional</option>
                      <option value="NON_FUNCTIONAL">Non-Functional</option>
                      <option value="USER_STORY">User Story</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Source</label>
                    <select
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="MANUAL_ENTRY">Manual Entry</option>
                      <option value="SRS">SRS Document</option>
                      <option value="USER_STORY">User Story</option>
                      <option value="MEETING">Meeting Notes</option>
                      <option value="IMPORTED_DOCUMENT">Imported Doc</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Acceptance Criteria</label>
                  <textarea
                    rows={3}
                    value={editCriteria}
                    onChange={(e) => setEditCriteria(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Change Summary for Version History</label>
                  <input
                    type="text"
                    placeholder="e.g. Refined security criteria and updated description"
                    value={editChangeSummary}
                    onChange={(e) => setEditChangeSummary(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="rounded-lg border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    {updating && <Loader2 className="size-3.5 animate-spin" />} Save New Version (v{selectedReq.current_version + 1})
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI REQUIREMENT REVIEW MODAL */}
        {reviewModalReq && (
          <RequirementReviewModal
            isOpen={!!reviewModalReq}
            onClose={() => setReviewModalReq(null)}
            projectId={projectId}
            requirementId={reviewModalReq.id}
            requirementKey={reviewModalReq.requirement_key}
            requirementTitle={reviewModalReq.title}
            versionNumber={reviewModalReq.current_version}
          />
        )}
      </div>
    </ProtectedShell>
  );
}
