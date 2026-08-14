"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SuperAdminShell from "@/components/SuperAdminShell";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  HardDrive,
  Cpu,
  Workflow,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Zap,
  ShieldAlert,
  History,
  Edit3,
  SlidersHorizontal,
  Check,
  X,
  Sparkles,
} from "lucide-react";

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subscription_plan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "DEACTIVATED";
  is_active: boolean;
  user_count: number;
  active_user_count: number;
  project_count: number;
  task_count: number;
  storage_used: number;
  ai_execution_count: number;
  subscription_limits: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface UserSummary {
  total_users: number;
  active_users: number;
  suspended_users: number;
  pending_invitations: number;
  users_by_company_role: Record<string, number>;
}

interface ResourceUsage {
  active_projects: number;
  total_projects: number;
  total_users: number;
  storage_used: number;
  storage_limit: number;
  ai_executions_used: number;
  ai_executions_limit: number;
  automation_workflows_used: number;
  automation_workflows_limit: number;
}

interface ResourceAllocation {
  company_id: string;
  subscription_plan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  custom_max_users: number | null;
  custom_max_projects: number | null;
  custom_max_storage_bytes: number | null;
  custom_max_ai_executions: number | null;
  custom_max_automation_workflows: number | null;
  custom_features: string[] | null;
  effective_max_users: number;
  effective_max_projects: number;
  effective_max_storage_bytes: number;
  effective_max_ai_executions: number;
  effective_max_automation_workflows: number;
  effective_enabled_features: string[];
  warnings: string[];
}

interface AuditLog {
  id: string;
  actor_super_admin_id: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  created_at: string;
}

const ALL_ENTERPRISE_FEATURES = [
  { code: "FEATURE_AI_AGENTS", label: "AI Agents" },
  { code: "FEATURE_RAG", label: "RAG Knowledge Search" },
  { code: "FEATURE_KNOWLEDGE_GRAPH", label: "Knowledge Graph" },
  { code: "FEATURE_PREDICTIVE_DELAY", label: "Predictive Delay Detection" },
  { code: "FEATURE_CONTEXTUAL_DELAY", label: "Contextual Delay Diagnostics" },
  { code: "FEATURE_REQUIREMENT_SCANNING", label: "Requirement Vulnerability Scanning" },
  { code: "FEATURE_API", label: "API" },
  { code: "FEATURE_WEBHOOKS", label: "Webhooks" },
  { code: "FEATURE_SSO", label: "SSO/SAML" },
  { code: "FEATURE_ADVANCED_RBAC", label: "Advanced RBAC" },
  { code: "FEATURE_ADVANCED_AI_GOVERNANCE", label: "Advanced AI Governance" },
  { code: "FEATURE_CUSTOM_INTEGRATIONS", label: "Custom Integrations" },
];

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const companyId = resolvedParams.id;
  const router = useRouter();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [usage, setUsage] = useState<ResourceUsage | null>(null);
  const [allocation, setAllocation] = useState<ResourceAllocation | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Action Modals State
  const [actionModal, setActionModal] = useState<"approve" | "reject" | "suspend" | "reactivate" | "deactivate" | "edit_plan" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionPlan, setActionPlan] = useState<"FREE" | "STARTER" | "PRO" | "ENTERPRISE">("FREE");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Custom Resource Allocation Editor State
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocConfirmOpen, setAllocConfirmOpen] = useState(false);

  const [formUsers, setFormUsers] = useState<string>("");
  const [formProjects, setFormProjects] = useState<string>("");
  const [formStorageGb, setFormStorageGb] = useState<string>("");
  const [formAi, setFormAi] = useState<string>("");
  const [formWorkflows, setFormWorkflows] = useState<string>("");
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [formReason, setFormReason] = useState<string>("");

  const [allocValidationError, setAllocValidationError] = useState<string | null>(null);
  const [allocSaveLoading, setAllocSaveLoading] = useState(false);

  const fetchAllCompanyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, userSumRes, usageRes, allocRes, logsRes] = await Promise.all([
        api.get(`/admin/companies/${companyId}`),
        api.get(`/admin/companies/${companyId}/users/summary`).catch(() => ({ data: { data: null } })),
        api.get(`/admin/companies/${companyId}/usage`).catch(() => ({ data: { data: null } })),
        api.get(`/admin/companies/${companyId}/resources`).catch(() => ({ data: { data: null } })),
        api.get(`/admin/audit-logs?company_id=${companyId}`).catch(() => ({ data: { data: { logs: [] } } })),
      ]);

      setCompany(detailRes.data.data);
      setActionPlan(detailRes.data.data.subscription_plan);
      setUserSummary(userSumRes.data.data);
      setUsage(usageRes.data.data);

      const allocData: ResourceAllocation = allocRes.data.data;
      setAllocation(allocData);
      setAuditLogs(logsRes.data.data?.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load company platform details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCompanyData();
  }, [companyId]);

  const handleOpenAllocModal = () => {
    if (!allocation) return;

    setFormUsers(allocation.custom_max_users !== null ? String(allocation.custom_max_users) : String(allocation.effective_max_users));
    setFormProjects(allocation.custom_max_projects !== null ? String(allocation.custom_max_projects) : String(allocation.effective_max_projects));

    const gbVal = allocation.custom_max_storage_bytes !== null
      ? (allocation.custom_max_storage_bytes === -1 ? -1 : Math.round(allocation.custom_max_storage_bytes / (1024 * 1024 * 1024)))
      : (allocation.effective_max_storage_bytes === -1 ? -1 : Math.round(allocation.effective_max_storage_bytes / (1024 * 1024 * 1024)));
    setFormStorageGb(String(gbVal));

    setFormAi(allocation.custom_max_ai_executions !== null ? String(allocation.custom_max_ai_executions) : String(allocation.effective_max_ai_executions));
    setFormWorkflows(allocation.custom_max_automation_workflows !== null ? String(allocation.custom_max_automation_workflows) : String(allocation.effective_max_automation_workflows));

    setFormFeatures(allocation.custom_features ? [...allocation.custom_features] : [...allocation.effective_enabled_features]);
    setFormReason("");
    setAllocValidationError(null);
    setAllocModalOpen(true);
  };

  const validateAllocForm = (): boolean => {
    const numUsers = parseInt(formUsers, 10);
    const numProj = parseInt(formProjects, 10);
    const numStorageGb = parseInt(formStorageGb, 10);
    const numAi = parseInt(formAi, 10);
    const numWorkflows = parseInt(formWorkflows, 10);

    if (isNaN(numUsers) || (numUsers < -1)) {
      setAllocValidationError("Maximum Users must be -1 (Unlimited) or a positive integer.");
      return false;
    }
    if (isNaN(numProj) || (numProj < -1)) {
      setAllocValidationError("Maximum Active Projects must be -1 (Unlimited) or a positive integer.");
      return false;
    }
    if (isNaN(numStorageGb) || (numStorageGb < -1)) {
      setAllocValidationError("Maximum Storage (GB) must be -1 (Unlimited) or a positive integer.");
      return false;
    }
    if (isNaN(numAi) || (numAi < -1)) {
      setAllocValidationError("Monthly AI Executions must be -1 (Unlimited) or a positive integer.");
      return false;
    }
    if (isNaN(numWorkflows) || (numWorkflows < -1)) {
      setAllocValidationError("Maximum Automation Workflows must be -1 (Unlimited) or a positive integer.");
      return false;
    }

    setAllocValidationError(null);
    return true;
  };

  const handleProceedAllocConfirm = () => {
    if (!validateAllocForm()) return;
    setAllocConfirmOpen(true);
  };

  const handleSaveAllocations = async () => {
    setAllocSaveLoading(true);
    setAllocValidationError(null);

    const numUsers = parseInt(formUsers, 10);
    const numProj = parseInt(formProjects, 10);
    const numStorageGb = parseInt(formStorageGb, 10);
    const numAi = parseInt(formAi, 10);
    const numWorkflows = parseInt(formWorkflows, 10);

    const storageBytes = numStorageGb === -1 ? -1 : numStorageGb * 1024 * 1024 * 1024;

    try {
      await api.patch(`/admin/companies/${companyId}/resources`, {
        custom_max_users: numUsers,
        custom_max_projects: numProj,
        custom_max_storage_bytes: storageBytes,
        custom_max_ai_executions: numAi,
        custom_max_automation_workflows: numWorkflows,
        custom_features: formFeatures,
        reason: formReason || undefined,
      });

      setAllocConfirmOpen(false);
      setAllocModalOpen(false);
      setSuccessMsg("Resource allocation overrides saved successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchAllCompanyData();
    } catch (err: any) {
      setAllocValidationError(err.response?.data?.message || "Failed to update resource allocation.");
      setAllocConfirmOpen(false);
    } finally {
      setAllocSaveLoading(false);
    }
  };

  const toggleFeatureCode = (code: string) => {
    setFormFeatures((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    if (actionModal === "reject" && !actionReason.trim()) {
      setActionError("A reason is required to reject a company application.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      if (actionModal === "approve") {
        await api.patch(`/admin/companies/${companyId}/approve`, { reason: actionReason || undefined });
      } else if (actionModal === "reject") {
        await api.patch(`/admin/companies/${companyId}/reject`, { reason: actionReason });
      } else if (actionModal === "suspend") {
        await api.patch(`/admin/companies/${companyId}/suspend`, { reason: actionReason || undefined });
      } else if (actionModal === "reactivate") {
        await api.patch(`/admin/companies/${companyId}/reactivate`, { reason: actionReason || undefined });
      } else if (actionModal === "deactivate") {
        await api.patch(`/admin/companies/${companyId}/deactivate`, { reason: actionReason || undefined });
      } else if (actionModal === "edit_plan") {
        await api.patch(`/admin/companies/${companyId}`, {
          subscription_plan: actionPlan,
          reason: actionReason || undefined,
        });
      }

      setActionModal(null);
      setActionReason("");
      setSuccessMsg("Action completed successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchAllCompanyData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || `Failed to execute action.`);
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "PENDING_APPROVAL":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "SUSPENDED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatLimit = (val?: number) => (val === -1 || val === undefined ? "Unlimited" : val.toLocaleString());

  const calcRemaining = (used: number, limit?: number) => {
    if (limit === undefined || limit === -1) return "Unlimited";
    const rem = limit - used;
    return rem >= 0 ? `${rem.toLocaleString()} remaining` : `Exceeded by ${Math.abs(rem).toLocaleString()}`;
  };

  const calcStorageRemaining = (usedBytes: number, limitBytes?: number) => {
    if (limitBytes === undefined || limitBytes === -1) return "Unlimited";
    const remBytes = limitBytes - usedBytes;
    const remGb = (remBytes / (1024 * 1024 * 1024)).toFixed(1);
    return remBytes >= 0 ? `${remGb} GB remaining` : `Exceeded by ${Math.abs(Number(remGb))} GB`;
  };

  return (
    <SuperAdminShell pageTitle="Company Detail & Resource Allocation">
      <div className="space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/companies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Company Management
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error / Success Banners */}
        {error && !loading && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && company && (
          <>
            {/* Header Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-foreground">{company.name}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${statusBadge(company.status)}`}>
                      {company.status.replace("_", " ")}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border bg-primary/10 text-primary border-primary/20">
                      {company.subscription_plan}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {company.id} | Slug: {company.slug} | Created: {new Date(company.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {company.status === "PENDING_APPROVAL" && (
                    <>
                      <button
                        onClick={() => { setActionModal("approve"); setActionError(null); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="size-4" /> Approve
                      </button>
                      <button
                        onClick={() => { setActionModal("reject"); setActionError(null); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors shadow-xs cursor-pointer"
                      >
                        <XCircle className="size-4" /> Reject
                      </button>
                    </>
                  )}

                  {company.status === "ACTIVE" && (
                    <button
                      onClick={() => { setActionModal("suspend"); setActionError(null); }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors cursor-pointer"
                    >
                      <Ban className="size-4" /> Suspend Company
                    </button>
                  )}

                  {company.status === "SUSPENDED" && (
                    <button
                      onClick={() => { setActionModal("reactivate"); setActionError(null); }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="size-4" /> Reactivate
                    </button>
                  )}

                  {(company.status === "ACTIVE" || company.status === "SUSPENDED") && (
                    <button
                      onClick={() => { setActionModal("deactivate"); setActionError(null); }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-colors cursor-pointer"
                    >
                      Deactivate
                    </button>
                  )}

                  <button
                    onClick={() => { setActionModal("edit_plan"); setActionError(null); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                  >
                    <Edit3 className="size-4" /> Change Plan
                  </button>
                </div>
              </div>

              {/* Warnings if any */}
              {allocation?.warnings && allocation.warnings.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {allocation.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
                      <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1. RESOURCE ALLOCATION & QUOTA MANAGEMENT SECTION */}
            <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="size-5 text-primary" /> Resource Allocation & Quota Management
                    </h3>

                    {/* Badge: Plan Default vs Custom Override */}
                    {allocation?.custom_max_users !== null ||
                    allocation?.custom_max_projects !== null ||
                    allocation?.custom_features !== null ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        Custom Override (Super Admin)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-muted text-muted-foreground border border-border">
                        Plan Default ({company.subscription_plan})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Displays live usage versus effective limits. Super Admins can override resource allocations and Enterprise capability toggles.
                  </p>
                </div>

                <button
                  onClick={handleOpenAllocModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
                >
                  <Sparkles className="size-4" />
                  Configure Custom Allocation
                </button>
              </div>

              {/* Resource Metrics & Quotas Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Users */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-4 text-blue-500" /> Users
                    </span>
                    {allocation?.custom_max_users !== null ? (
                      <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400">Custom</span>
                    ) : (
                      <span className="text-[12px] font-medium text-muted-foreground">Plan</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {company.user_count} / {formatLimit(allocation?.effective_max_users)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {calcRemaining(company.user_count, allocation?.effective_max_users)}
                  </div>
                </div>

                {/* Active Projects */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FolderKanban className="size-4 text-amber-500" /> Active Projects
                    </span>
                    {allocation?.custom_max_projects !== null ? (
                      <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400">Custom</span>
                    ) : (
                      <span className="text-[12px] font-medium text-muted-foreground">Plan</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {company.project_count} / {formatLimit(allocation?.effective_max_projects)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {calcRemaining(company.project_count, allocation?.effective_max_projects)}
                  </div>
                </div>

                {/* Storage */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <HardDrive className="size-4 text-purple-500" /> Storage
                    </span>
                    {allocation?.custom_max_storage_bytes !== null ? (
                      <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400">Custom</span>
                    ) : (
                      <span className="text-[12px] font-medium text-muted-foreground">Plan</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {usage ? `${(usage.storage_used / (1024 * 1024)).toFixed(1)} MB` : "0 MB"} / {allocation?.effective_max_storage_bytes === -1 ? "Unlimited" : `${((allocation?.effective_max_storage_bytes || 0) / (1024 * 1024 * 1024)).toFixed(0)} GB`}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {calcStorageRemaining(usage?.storage_used || 0, allocation?.effective_max_storage_bytes)}
                  </div>
                </div>

                {/* AI Executions */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Cpu className="size-4 text-indigo-500" /> AI Executions
                    </span>
                    {allocation?.custom_max_ai_executions !== null ? (
                      <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400">Custom</span>
                    ) : (
                      <span className="text-[12px] font-medium text-muted-foreground">Plan</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {company.ai_execution_count.toLocaleString()} / {formatLimit(allocation?.effective_max_ai_executions)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {calcRemaining(company.ai_execution_count, allocation?.effective_max_ai_executions)}
                  </div>
                </div>

                {/* Automation Workflows */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Workflow className="size-4 text-rose-500" /> Workflows
                    </span>
                    {allocation?.custom_max_automation_workflows !== null ? (
                      <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400">Custom</span>
                    ) : (
                      <span className="text-[12px] font-medium text-muted-foreground">Plan</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {usage?.automation_workflows_used || 0} / {formatLimit(allocation?.effective_max_automation_workflows)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {calcRemaining(usage?.automation_workflows_used || 0, allocation?.effective_max_automation_workflows)}
                  </div>
                </div>
              </div>

              {/* Enabled Capabilities */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Effective Feature Capabilities ({allocation?.effective_enabled_features?.length || 0})
                </div>
                <div className="flex flex-wrap gap-2">
                  {allocation?.effective_enabled_features?.map((feat) => (
                    <span key={feat} className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* User Breakdown Section */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="size-5 text-primary" /> User Account Summary
              </h3>

              {userSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/40 p-3 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground font-bold">Total Users</div>
                    <div className="text-xl font-extrabold text-foreground">{userSummary.total_users}</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground font-bold">Active</div>
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{userSummary.active_users}</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground font-bold">Suspended</div>
                    <div className="text-xl font-extrabold text-destructive">{userSummary.suspended_users}</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground font-bold">Pending Invites</div>
                    <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{userSummary.pending_invitations}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Audit History */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="size-5 text-primary" /> Company Audit History ({auditLogs.length})
              </h3>

              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 text-xs">Action</th>
                      <th className="py-3 px-4 text-xs">Super Admin Actor</th>
                      <th className="py-3 px-4 text-xs">Date / Time</th>
                      <th className="py-3 px-4 text-xs">Old Value</th>
                      <th className="py-3 px-4 text-xs">New Value</th>
                      <th className="py-3 px-4 text-xs">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs font-medium">
                          No audit log history recorded for this company.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-extrabold uppercase">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                            {log.actor_super_admin_id}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{log.previous_value || "—"}</td>
                          <td className="py-3 px-4 text-xs font-semibold text-foreground">{log.new_value || "—"}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground italic">{log.reason || "None specified"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 2. CONFIGURE CUSTOM RESOURCE ALLOCATION MODAL */}
        {allocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 text-foreground my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="size-5 text-primary" /> Custom Resource Allocation Overrides
                  </h3>
                  <p className="text-xs text-muted-foreground">Company: {company?.name}</p>
                </div>
                <button
                  onClick={() => setAllocModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {allocValidationError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{allocValidationError}</span>
                </div>
              )}

              {/* Form Input Fields */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Numerical Quota Overrides (Set -1 for Unlimited)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Maximum Users
                    </label>
                    <input
                      type="number"
                      value={formUsers}
                      onChange={(e) => setFormUsers(e.target.value)}
                      placeholder="e.g. 100 or -1"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Maximum Active Projects
                    </label>
                    <input
                      type="number"
                      value={formProjects}
                      onChange={(e) => setFormProjects(e.target.value)}
                      placeholder="e.g. 50 or -1"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Maximum Storage (GB)
                    </label>
                    <input
                      type="number"
                      value={formStorageGb}
                      onChange={(e) => setFormStorageGb(e.target.value)}
                      placeholder="e.g. 50 or -1"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Monthly AI Executions
                    </label>
                    <input
                      type="number"
                      value={formAi}
                      onChange={(e) => setFormAi(e.target.value)}
                      placeholder="e.g. 10000 or -1"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Maximum Automation Workflows
                    </label>
                    <input
                      type="number"
                      value={formWorkflows}
                      onChange={(e) => setFormWorkflows(e.target.value)}
                      placeholder="e.g. 20 or -1"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Enterprise Capability Toggles
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ALL_ENTERPRISE_FEATURES.map((feat) => {
                      const isChecked = formFeatures.includes(feat.code);
                      return (
                        <button
                          key={feat.code}
                          type="button"
                          onClick={() => toggleFeatureCode(feat.code)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isChecked
                              ? "bg-primary/10 text-primary border-primary/40 font-bold"
                              : "bg-muted/40 text-muted-foreground border-border hover:bg-accent"
                          }`}
                        >
                          <span>{feat.label}</span>
                          {isChecked && <Check className="size-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Audit Reason */}
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Reason for Audit Log (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter reason for overriding limits..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground focus:ring-ring focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAllocModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleProceedAllocConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                >
                  Review & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. CONFIRMATION DIALOG FOR RESOURCE OVERRIDES */}
        {allocConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="size-5 text-primary" /> Confirm Resource Overrides
                </h3>
              </div>

              <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-border">
                Are you sure you want to apply custom resource allocation overrides for <strong className="text-foreground">{company?.name}</strong>?
                This will immediately update effective limits and log an audit record.
              </div>

              <div className="space-y-1 text-xs font-semibold text-foreground bg-muted/20 p-3 rounded-xl border border-border">
                <div>Users: <strong>{formUsers}</strong></div>
                <div>Projects: <strong>{formProjects}</strong></div>
                <div>Storage: <strong>{formStorageGb} GB</strong></div>
                <div>AI Quota: <strong>{formAi}</strong></div>
                <div>Workflows: <strong>{formWorkflows}</strong></div>
                <div>Features Enabled: <strong>{formFeatures.length}</strong></div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAllocConfirmOpen(false)}
                  disabled={allocSaveLoading}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllocations}
                  disabled={allocSaveLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {allocSaveLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm & Save API
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Standard Action Dialog Confirmation Modals */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="size-5 text-primary" />
                  {actionModal === "approve" && "Approve Company"}
                  {actionModal === "reject" && "Reject Company Application"}
                  {actionModal === "suspend" && "Suspend Company Account"}
                  {actionModal === "reactivate" && "Reactivate Company Account"}
                  {actionModal === "deactivate" && "Deactivate Company Account"}
                  {actionModal === "edit_plan" && "Change Subscription Plan"}
                </h3>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Action Explanations */}
              <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-border">
                {actionModal === "approve" && "Approving this company will activate the organization and grant members platform access."}
                {actionModal === "reject" && "Rejecting this company will mark the application as rejected. Please provide a reason for the tenant."}
                {actionModal === "suspend" && "Warning: Suspending this company will temporarily block all users in this organization from logging in until reactivated."}
                {actionModal === "reactivate" && "Reactivating this company will restore full platform login and project access for all members."}
                {actionModal === "deactivate" && "Warning: Deactivating this company will deactivate organization operations and block new resource creation."}
                {actionModal === "edit_plan" && "Changing the plan will immediately update entitlement limits. Existing data will be preserved if usage exceeds the new plan."}
              </div>

              {/* Inputs */}
              {actionModal === "edit_plan" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Select New Subscription Plan
                  </label>
                  <select
                    value={actionPlan}
                    onChange={(e: any) => setActionPlan(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                  >
                    <option value="FREE">FREE ($0/mo)</option>
                    <option value="STARTER">STARTER ($19/mo)</option>
                    <option value="PRO">PRO ($49/mo)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Custom)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason for Audit Log {actionModal === "reject" ? "(Required)" : "(Optional)"}
                </label>
                <input
                  type="text"
                  placeholder="Enter administrative reason..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground focus:ring-ring focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 ${
                    actionModal === "suspend" || actionModal === "reject" || actionModal === "deactivate"
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {actionLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
