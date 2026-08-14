"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SuperAdminShell from "@/components/SuperAdminShell";
import { api } from "@/lib/api";
import {
  History,
  Building2,
  Users,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Zap,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  actor_super_admin_id: string;
  company_id?: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface CompanySummaryItem {
  id: string;
  name: string;
}

const AUDIT_ACTIONS = [
  { code: "COMPANY_APPROVED", label: "COMPANY APPROVED" },
  { code: "COMPANY_REJECTED", label: "COMPANY REJECTED" },
  { code: "COMPANY_SUSPENDED", label: "COMPANY SUSPENDED" },
  { code: "COMPANY_REACTIVATED", label: "COMPANY REACTIVATED" },
  { code: "COMPANY_DEACTIVATED", label: "COMPANY DEACTIVATED" },
  { code: "SUBSCRIPTION_CHANGED", label: "SUBSCRIPTION CHANGED" },
  { code: "RESOURCE_LIMIT_CHANGED", label: "RESOURCE LIMIT CHANGED" },
];

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [companies, setCompanies] = useState<CompanySummaryItem[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Company list for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get("/admin/companies?limit=100");
        const list: CompanySummaryItem[] = res.data.data.companies.map((c: any) => ({
          id: c.id,
          name: c.name,
        }));
        setCompanies(list);
        const map: Record<string, string> = {};
        list.forEach((c) => {
          map[c.id] = c.name;
        });
        setCompaniesMap(map);
      } catch (err) {
        console.error("Failed to load companies for audit filter", err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchAuditLogs = async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      let query = `/admin/audit-logs?page=${currentPage}&limit=${limit}`;

      if (selectedCompanyId) {
        query += `&company_id=${selectedCompanyId}`;
      }
      if (selectedAction) {
        query += `&action=${selectedAction}`;
      }
      if (startDate) {
        query += `&start_date=${new Date(startDate).toISOString()}`;
      }
      if (endDate) {
        query += `&end_date=${new Date(`${endDate}T23:59:59`).toISOString()}`;
      }

      const res = await api.get(query);
      setLogs(res.data.data.logs || []);
      setTotal(res.data.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(page);
  }, [page, selectedCompanyId, selectedAction, startDate, endDate]);

  const handleResetFilters = () => {
    setSelectedCompanyId("");
    setSelectedAction("");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setPage(1);
  };

  // Client-side search filtering across action, reason, super admin actor ID, company name
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const companyName = log.company_id ? (companiesMap[log.company_id] || log.company_id) : "";
    return (
      log.action.toLowerCase().includes(term) ||
      (log.reason && log.reason.toLowerCase().includes(term)) ||
      log.actor_super_admin_id.toLowerCase().includes(term) ||
      companyName.toLowerCase().includes(term) ||
      (log.previous_value && log.previous_value.toLowerCase().includes(term)) ||
      (log.new_value && log.new_value.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const getActionBadgeStyle = (action: string) => {
    switch (action) {
      case "COMPANY_APPROVED":
      case "COMPANY_REACTIVATED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "COMPANY_REJECTED":
      case "COMPANY_SUSPENDED":
      case "COMPANY_DEACTIVATED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "SUBSCRIPTION_CHANGED":
      case "RESOURCE_LIMIT_CHANGED":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <SuperAdminShell pageTitle="Platform Audit Logs">
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <History className="size-6 text-primary" /> Immutable Platform Audit Log Trail
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Read-only system audit log recording all platform administrative actions, status transitions, subscription updates, and custom resource overrides.
            </p>
          </div>
        </div>

        {/* Filter & Search Controls Bar */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Filter className="size-4 text-primary" /> Filter & Search Controls
            </h3>

            {(selectedCompanyId || selectedAction || startDate || endDate || searchTerm) && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-foreground hover:bg-accent text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search input */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Search Terms
              </label>
              <div className="relative">
                <Search className="size-3.5 text-muted-foreground absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search actor, reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground focus:ring-ring focus:outline-none"
                />
              </div>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Filter by Company
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => { setSelectedCompanyId(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
              >
                <option value="">All Tenant Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Filter by Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
              >
                <option value="">All Audit Actions</option>
                {AUDIT_ACTIONS.map((act) => (
                  <option key={act.code} value={act.code}>
                    {act.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-ring focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-xs">Timestamp</th>
                    <th className="py-3.5 px-4 text-xs">Super Admin Actor</th>
                    <th className="py-3.5 px-4 text-xs">Company</th>
                    <th className="py-3.5 px-4 text-xs">Action</th>
                    <th className="py-3.5 px-4 text-xs">Previous Value</th>
                    <th className="py-3.5 px-4 text-xs">New Value</th>
                    <th className="py-3.5 px-4 text-xs">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-muted-foreground font-medium text-xs space-y-2">
                        <History className="size-8 mx-auto text-muted-foreground/50" />
                        <div>No audit logs found matching your filter criteria.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const companyName = log.company_id ? (companiesMap[log.company_id] || log.company_id) : "Platform System";
                      return (
                        <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {log.actor_super_admin_id}
                          </td>

                          <td className="py-3.5 px-4">
                            {log.company_id ? (
                              <Link
                                href={`/admin/companies/${log.company_id}`}
                                className="font-bold text-foreground text-xs hover:text-primary transition-colors flex items-center gap-1.5"
                              >
                                <Building2 className="size-3.5 text-primary" />
                                {companyName}
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Platform System</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wide border ${getActionBadgeStyle(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                            {log.previous_value || "—"}
                          </td>

                          <td className="py-3.5 px-4 text-xs font-bold text-foreground font-mono">
                            {log.new_value || "—"}
                          </td>

                          <td className="py-3.5 px-4 text-xs text-muted-foreground italic max-w-xs truncate">
                            {log.reason || "None specified"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({total} total logs)
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
    </SuperAdminShell>
  );
}
