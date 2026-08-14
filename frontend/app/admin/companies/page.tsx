"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SuperAdminShell from "@/components/SuperAdminShell";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  Edit3,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  CheckCircle2,
  XCircle,
  History,
  Eye,
  ShieldAlert,
} from "lucide-react";

interface AdminCompany {
  id: string;
  name: string;
  slug: string;
  subscription_plan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  status?: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "DEACTIVATED";
  is_active: boolean;
  user_count: number;
  project_count: number;
  task_count: number;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  actor_super_admin_id: string;
  company_id?: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  created_at: string;
}

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [pendingCompanies, setPendingCompanies] = useState<AdminCompany[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Action State for Pending Approvals
  const [actionCompany, setActionCompany] = useState<AdminCompany | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Modal State
  const [editingCompany, setEditingCompany] = useState<AdminCompany | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "STARTER" | "PRO" | "ENTERPRISE">("FREE");
  const [selectedIsActive, setSelectedIsActive] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchPageData = async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, pendingRes, logsRes] = await Promise.all([
        api.get(`/admin/companies?page=${currentPage}&limit=${limit}`),
        api.get("/admin/companies/pending").catch(() => ({ data: { data: { companies: [] } } })),
        api.get("/admin/audit-logs?limit=10").catch(() => ({ data: { data: { logs: [] } } })),
      ]);

      setCompanies(compRes.data.data.companies);
      setTotal(compRes.data.data.total);
      setPendingCompanies(pendingRes.data.data.companies || []);
      setAuditLogs(logsRes.data.data.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load company data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData(page);
  }, [page]);

  const handleOpenEditModal = (company: AdminCompany) => {
    setEditingCompany(company);
    setSelectedPlan(company.subscription_plan);
    setSelectedIsActive(company.is_active);
    setSaveError(null);
  };

  const handleSaveCompany = async () => {
    if (!editingCompany) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await api.patch(`/admin/companies/${editingCompany.id}`, {
        subscription_plan: selectedPlan,
        is_active: selectedIsActive,
      });

      setEditingCompany(null);
      fetchPageData(page);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to update company.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePendingAction = async () => {
    if (!actionCompany || !actionType) return;
    if (actionType === "reject" && !actionReason.trim()) {
      setActionError("A reason is required to reject an application.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      if (actionType === "approve") {
        await api.patch(`/admin/companies/${actionCompany.id}/approve`, {
          reason: actionReason || undefined,
        });
      } else {
        await api.patch(`/admin/companies/${actionCompany.id}/reject`, {
          reason: actionReason,
        });
      }

      setActionCompany(null);
      setActionType(null);
      setActionReason("");
      fetchPageData(page);
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to process application.");
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const planBadgeStyle = (plan: string) => {
    switch (plan) {
      case "ENTERPRISE":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "STARTER":
      case "PRO":
        return "bg-primary/10 text-primary border-primary/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <SuperAdminShell pageTitle="Company Management">
      <div className="space-y-8">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-xs">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> Platform Tenant Organizations ({total})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect company organizations, manage approvals, subscription entitlements, and resource limits.
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. PENDING APPROVALS SECTION */}
        {pendingCompanies.length > 0 && (
          <div className="rounded-2xl border-2 border-amber-500/30 bg-card overflow-hidden shadow-xs space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShieldAlert className="size-5 text-amber-500" /> Pending Registrations & Approvals ({pendingCompanies.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review new tenant organization requests requiring Super Admin approval.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 text-xs">Company Name</th>
                    <th className="py-3 px-4 text-xs">Registration Date</th>
                    <th className="py-3 px-4 text-xs">Requested Plan</th>
                    <th className="py-3 px-4 text-xs">Users</th>
                    <th className="py-3 px-4 text-xs">Status</th>
                    <th className="py-3 px-4 text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {pendingCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link href={`/admin/companies/${company.id}`} className="font-bold text-foreground text-sm hover:text-primary transition-colors">
                          {company.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">slug: {company.slug}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(company.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold uppercase border ${planBadgeStyle(company.subscription_plan)}`}>
                          <Zap className="size-3" />
                          {company.subscription_plan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-foreground">
                        {company.user_count}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Pending Approval
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setActionCompany(company); setActionType("approve"); setActionReason(""); setActionError(null); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="size-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => { setActionCompany(company); setActionType("reject"); setActionReason(""); setActionError(null); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors cursor-pointer"
                          >
                            <XCircle className="size-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. ALL COMPANIES TABLE */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Registered Tenant Organizations
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-10 text-primary animate-spin" />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-xs">Company Name</th>
                      <th className="py-3.5 px-4 text-xs">Subscription Plan</th>
                      <th className="py-3.5 px-4 text-xs">Status</th>
                      <th className="py-3.5 px-4 text-xs">Users</th>
                      <th className="py-3.5 px-4 text-xs">Projects</th>
                      <th className="py-3.5 px-4 text-xs">Tasks</th>
                      <th className="py-3.5 px-4 text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {companies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium text-xs">
                          No companies registered on platform yet.
                        </td>
                      </tr>
                    ) : (
                      companies.map((company) => (
                        <tr key={company.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <Link href={`/admin/companies/${company.id}`} className="font-bold text-foreground text-sm hover:text-primary transition-colors">
                              {company.name}
                            </Link>
                            <div className="text-xs text-muted-foreground font-mono">slug: {company.slug}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wide border ${planBadgeStyle(
                                company.subscription_plan
                              )}`}
                            >
                              <Zap className="size-3" />
                              {company.subscription_plan}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {company.is_active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                <span className="size-1.5 rounded-full bg-destructive" />
                                Suspended
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                              <Users className="size-3.5 text-blue-600 dark:text-blue-400" />
                              {company.user_count}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                              <FolderKanban className="size-3.5 text-amber-600 dark:text-amber-400" />
                              {company.project_count}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                              <CheckSquare className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              {company.task_count}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/companies/${company.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground hover:bg-accent text-xs font-semibold transition-colors"
                              >
                                <Eye className="size-3.5" /> Detail
                              </Link>
                              <button
                                onClick={() => handleOpenEditModal(company)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground hover:bg-accent text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Edit3 className="size-3.5" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground">
                    Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. RECENT AUDIT LOGS SECTION */}
        {auditLogs.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="size-5 text-primary" /> Platform Super Admin Audit Logs
            </h3>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 text-xs">Action</th>
                    <th className="py-3 px-4 text-xs">Super Admin Actor</th>
                    <th className="py-3 px-4 text-xs">Timestamp</th>
                    <th className="py-3 px-4 text-xs">Old Value</th>
                    <th className="py-3 px-4 text-xs">New Value</th>
                    <th className="py-3 px-4 text-xs">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {auditLogs.map((log) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Action Confirmation Modal */}
        {actionCompany && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">
                  {actionType === "approve" ? "Approve Company Registration" : "Reject Company Application"}
                </h3>
                <button onClick={() => { setActionCompany(null); setActionType(null); }} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Company: <strong className="text-foreground">{actionCompany.name}</strong> ({actionCompany.subscription_plan} Plan)
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason {actionType === "reject" ? "(Required)" : "(Optional)"}
                </label>
                <input
                  type="text"
                  placeholder={actionType === "reject" ? "State rejection reason..." : "State approval notes..."}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground focus:ring-ring focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setActionCompany(null); setActionType(null); }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePendingAction}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs ${
                    actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-destructive hover:bg-destructive/90"
                  }`}
                >
                  {actionLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm {actionType === "approve" ? "Approval" : "Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {editingCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Edit Company Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">{editingCompany.name}</p>
                </div>
                <button
                  onClick={() => setEditingCompany(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Subscription Plan dropdown */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Subscription Plan
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e: any) => setSelectedPlan(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
                  >
                    <option value="FREE">FREE</option>
                    <option value="STARTER">STARTER</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </div>

                {/* Active / Suspended Status Toggle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Account Status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedIsActive(true)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selectedIsActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-2xs font-extrabold"
                          : "bg-muted text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {selectedIsActive && <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
                      Active
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedIsActive(false)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !selectedIsActive
                          ? "bg-destructive/10 text-destructive border-destructive/40 shadow-2xs font-extrabold"
                          : "bg-muted text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {!selectedIsActive && <Check className="size-3.5 text-destructive" />}
                      Suspended
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveCompany}
                  disabled={saveLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saveLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
