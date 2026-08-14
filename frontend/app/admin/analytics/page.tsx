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
  HardDrive,
  Cpu,
  Workflow,
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Calendar,
  Zap,
  Activity,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
} from "lucide-react";

interface OverviewMetrics {
  total_companies: number;
  active_companies: number;
  pending_companies: number;
  suspended_companies: number;
  total_users: number;
  active_users: number;
  total_projects: number;
  total_tasks: number;
  ai_executions_this_month: number;
  storage_used: number;
  companies_by_subscription_plan: Record<string, number>;
}

interface GrowthPoint {
  date: string;
  count: number;
}

interface GrowthData {
  range: string;
  company_registrations: GrowthPoint[];
  user_registrations: GrowthPoint[];
  ai_execution_volume: GrowthPoint[];
  active_companies: GrowthPoint[];
}

interface SubscriptionMetrics {
  free_count: number;
  starter_count: number;
  pro_count: number;
  enterprise_count: number;
  total: number;
  percentage_distribution: Record<string, number>;
}

interface AIUsageMetrics {
  total_ai_executions: number;
  queued_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  executions_by_type: Record<string, number>;
  executions_this_month: number;
}

interface CompanyItem {
  id: string;
  name: string;
  slug: string;
  subscription_plan: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  status?: string;
  is_active: boolean;
  user_count: number;
  project_count: number;
  task_count: number;
  created_at: string;
}

export default function SuperAdminAnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionMetrics | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageMetrics | null>(null);
  const [topCompanies, setTopCompanies] = useState<CompanyItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, subRes, aiRes, compRes] = await Promise.all([
        api.get("/admin/analytics/overview"),
        api.get("/admin/analytics/subscriptions"),
        api.get("/admin/analytics/ai-usage"),
        api.get("/admin/companies?page=1&limit=10"),
      ]);

      setOverview(ovRes.data.data);
      setSubscriptions(subRes.data.data);
      setAiUsage(aiRes.data.data);
      setTopCompanies(compRes.data.data.companies || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load platform analytics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGrowthData = async (selectedRange: string) => {
    setGrowthLoading(true);
    try {
      const res = await api.get(`/admin/analytics/growth?range=${selectedRange}`);
      setGrowth(res.data.data);
    } catch (err) {
      console.error("Failed to load growth data", err);
    } finally {
      setGrowthLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    fetchGrowthData(range);
  }, [range]);

  const maxGrowthValue = growth?.company_registrations && growth.company_registrations.length > 0
    ? Math.max(...growth.company_registrations.map((p) => p.count), 1)
    : 1;

  return (
    <SuperAdminShell pageTitle="Platform Analytics & Intelligence">
      <div className="space-y-8">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
          <div>
            <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <BarChart3 className="size-6 text-primary" /> Platform Executive Analytics
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Platform-level telemetry, subscription distribution, company growth trends, and aggregate AI job metrics.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border shrink-0">
            {(["7d", "30d", "90d", "1y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === r
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                {r === "7d" && "7 Days"}
                {r === "30d" && "30 Days"}
                {r === "90d" && "90 Days"}
                {r === "1y" && "1 Year"}
              </button>
            ))}
          </div>
        </div>

        {/* Global Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-12 text-primary animate-spin" />
          </div>
        )}

        {/* Global Error State */}
        {error && !loading && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-xs text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-6 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && overview && (
          <>
            {/* 1. PLATFORM OVERVIEW METRIC CARDS (7 CARDS GRID) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {/* Total Companies */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Co.</span>
                  <Building2 className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">{overview.total_companies}</div>
                <div className="text-xs text-muted-foreground mt-1">Tenant Orgs</div>
              </div>

              {/* Active Companies */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{overview.active_companies}</div>
                <div className="text-xs text-muted-foreground mt-1">Operational</div>
              </div>

              {/* Pending Companies */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                  <Clock className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{overview.pending_companies}</div>
                <div className="text-xs text-muted-foreground mt-1">Awaiting Review</div>
              </div>

              {/* Suspended Companies */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Suspended</span>
                  <Ban className="size-4 text-destructive" />
                </div>
                <div className="text-2xl font-black text-destructive">{overview.suspended_companies}</div>
                <div className="text-xs text-muted-foreground mt-1">Restricted</div>
              </div>

              {/* Total Users */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Users</span>
                  <Users className="size-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-foreground">{overview.total_users}</div>
                <div className="text-xs text-muted-foreground mt-1">{overview.active_users} Active</div>
              </div>

              {/* AI Executions This Month */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">AI Monthly</span>
                  <Cpu className="size-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-foreground">{overview.ai_executions_this_month.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Current Month</div>
              </div>

              {/* Storage Used */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Storage</span>
                  <HardDrive className="size-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {(overview.storage_used / (1024 * 1024)).toFixed(1)} MB
                </div>
                <div className="text-xs text-muted-foreground mt-1">Platform Total</div>
              </div>
            </div>

            {/* 2. COMPANY GROWTH TIME-SERIES SECTION */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="size-5 text-primary" /> Tenant Organization Growth ({range})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Time-series volume of new company registrations recorded over the selected timeframe.
                  </p>
                </div>
                {growthLoading && <Loader2 className="size-5 text-primary animate-spin" />}
              </div>

              {growth?.company_registrations && growth.company_registrations.length > 0 ? (
                <div className="pt-4 space-y-3">
                  <div className="h-44 w-full flex items-end gap-2 px-2 border-b border-border pb-2">
                    {growth.company_registrations.map((pt, idx) => {
                      const pct = Math.max(15, Math.round((pt.count / maxGrowthValue) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-bold shadow-md z-10 whitespace-nowrap">
                            {pt.date}: {pt.count} company reg.
                          </div>
                          <div
                            style={{ height: `${pct}%` }}
                            className="w-full bg-primary/80 group-hover:bg-primary rounded-t-md transition-all shadow-2xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-2">
                    <span>{growth.company_registrations[0]?.date}</span>
                    <span>{growth.company_registrations[growth.company_registrations.length - 1]?.date}</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground font-medium">
                  No company registrations recorded in the selected {range} period.
                </div>
              )}
            </div>

            {/* 3. SUBSCRIPTION DISTRIBUTION & STATUS BREAKDOWN (2-COLUMN GRID) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subscription Distribution */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PieChart className="size-5 text-primary" /> Subscription Plan Distribution
                </h3>

                {subscriptions && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-muted/40 p-3 rounded-xl border border-border">
                        <div className="text-xs text-muted-foreground font-bold">FREE</div>
                        <div className="text-xl font-extrabold text-foreground">{subscriptions.free_count}</div>
                        <div className="text-xs text-muted-foreground">{subscriptions.percentage_distribution["FREE"] || 0}%</div>
                      </div>

                      <div className="bg-muted/40 p-3 rounded-xl border border-border">
                        <div className="text-xs text-muted-foreground font-bold">STARTER</div>
                        <div className="text-xl font-extrabold text-primary">{subscriptions.starter_count}</div>
                        <div className="text-xs text-muted-foreground">{subscriptions.percentage_distribution["STARTER"] || 0}%</div>
                      </div>

                      <div className="bg-muted/40 p-3 rounded-xl border border-border">
                        <div className="text-xs text-muted-foreground font-bold">PRO</div>
                        <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{subscriptions.pro_count}</div>
                        <div className="text-xs text-muted-foreground">{subscriptions.percentage_distribution["PRO"] || 0}%</div>
                      </div>

                      <div className="bg-muted/40 p-3 rounded-xl border border-border">
                        <div className="text-xs text-muted-foreground font-bold">ENTERPRISE</div>
                        <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{subscriptions.enterprise_count}</div>
                        <div className="text-xs text-muted-foreground">{subscriptions.percentage_distribution["ENTERPRISE"] || 0}%</div>
                      </div>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex shadow-2xs">
                      <div style={{ width: `${subscriptions.percentage_distribution["FREE"] || 0}%` }} className="bg-slate-400 dark:bg-slate-600" title="FREE" />
                      <div style={{ width: `${subscriptions.percentage_distribution["STARTER"] || 0}%` }} className="bg-primary" title="STARTER" />
                      <div style={{ width: `${subscriptions.percentage_distribution["PRO"] || 0}%` }} className="bg-blue-500" title="PRO" />
                      <div style={{ width: `${subscriptions.percentage_distribution["ENTERPRISE"] || 0}%` }} className="bg-purple-500" title="ENTERPRISE" />
                    </div>
                  </div>
                )}
              </div>

              {/* Company Status Breakdown */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Activity className="size-5 text-primary" /> Tenant Organization Status Breakdown
                </h3>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="flex items-center gap-2"><CheckCircle2 className="size-4" /> Active Organizations</span>
                    <span>{overview.active_companies}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <span className="flex items-center gap-2"><Clock className="size-4" /> Pending Approvals</span>
                    <span>{overview.pending_companies}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive">
                    <span className="flex items-center gap-2"><Ban className="size-4" /> Suspended Companies</span>
                    <span>{overview.suspended_companies}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. AI USAGE ANALYTICS SECTION */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Cpu className="size-5 text-indigo-500" /> Platform AI Execution Volume Telemetry
              </h3>

              {aiUsage && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-muted/40 p-3 rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground font-bold">Total Jobs</div>
                      <div className="text-xl font-extrabold text-foreground">{aiUsage.total_ai_executions.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground font-bold">Completed</div>
                      <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{aiUsage.completed_jobs.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground font-bold">Running</div>
                      <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{aiUsage.running_jobs.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground font-bold">Queued</div>
                      <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{aiUsage.queued_jobs.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border border-border">
                      <div className="text-xs text-muted-foreground font-bold">Failed</div>
                      <div className="text-xl font-extrabold text-destructive">{aiUsage.failed_jobs.toLocaleString()}</div>
                    </div>
                  </div>

                  {aiUsage.executions_by_type && Object.keys(aiUsage.executions_by_type).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executions by Job Type</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(aiUsage.executions_by_type).map(([type, cnt]) => (
                          <span key={type} className="px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-semibold text-foreground">
                            {type}: <strong className="text-primary">{cnt.toLocaleString()}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. TOP USAGE COMPANIES TABLE (SAFE PLATFORM METRICS ONLY) */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Top Platform Companies Telemetry
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Platform-level metric totals (users, projects, tasks) per company. Zero private project names, documents, or content exposed.
                </p>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-xs">Company Name</th>
                      <th className="py-3.5 px-4 text-xs">Plan</th>
                      <th className="py-3.5 px-4 text-xs">Users</th>
                      <th className="py-3.5 px-4 text-xs">Projects</th>
                      <th className="py-3.5 px-4 text-xs">Tasks</th>
                      <th className="py-3.5 px-4 text-xs">Status</th>
                      <th className="py-3.5 px-4 text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {topCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs font-medium">
                          No tenant companies registered on platform yet.
                        </td>
                      </tr>
                    ) : (
                      topCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-foreground text-sm">
                            <Link href={`/admin/companies/${c.id}`} className="hover:text-primary transition-colors">
                              {c.name}
                            </Link>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-extrabold uppercase">
                              {c.subscription_plan}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-foreground text-xs">{c.user_count}</td>
                          <td className="py-3.5 px-4 font-bold text-foreground text-xs">{c.project_count}</td>
                          <td className="py-3.5 px-4 font-bold text-foreground text-xs">{c.task_count}</td>

                          <td className="py-3.5 px-4">
                            {c.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                Suspended
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/admin/companies/${c.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground hover:bg-accent text-xs font-semibold transition-colors"
                            >
                              <Eye className="size-3.5" /> View Detail
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SuperAdminShell>
  );
}
