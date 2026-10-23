"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import SuperAdminShell from "@/components/SuperAdminShell";
import SuperAdminAnalyticsCharts, {
  AnalyticsMonthlyResponse,
  OverviewMetrics,
  AIUsageMetrics,
} from "@/components/admin/SuperAdminAnalyticsCharts";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  History,
  BarChart3,
  RefreshCw,
} from "lucide-react";

export default function SuperAdminOverviewPage() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [monthly, setMonthly] = useState<AnalyticsMonthlyResponse | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [ovRes, moRes, aiRes] = await Promise.all([
        api.get("/admin/analytics/overview"),
        api.get("/admin/analytics/monthly?months=12"),
        api.get("/admin/analytics/ai-usage"),
      ]);

      setOverview(ovRes.data.data);
      setMonthly(moRes.data.data);
      setAiUsage(aiRes.data.data);
    } catch (err: any) {
      console.error("Failed to load super admin telemetry:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load platform telemetry and monthly analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <SuperAdminShell pageTitle="Executive Platform Telemetry">
      <div className="space-y-8">
        {/* Banner with Status & Quick Actions */}
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="size-48 text-primary" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                Super Admin Command Center
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                Platform Intelligence & Monthly Telemetry
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Live monitoring of multi-tenant companies, active user engagement, monthly AI request throughput, and system-wide workload health.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
                <span>{refreshing ? "Refreshing..." : "Sync Metrics"}</span>
              </button>

              <Link
                href="/admin/companies"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-2xs hover:bg-primary/90 transition-opacity"
              >
                <span>Manage Tenants</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Global Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="size-10 text-primary animate-spin" />
            <span className="text-xs font-bold text-muted-foreground">
              Computing Platform Telemetry Curves...
            </span>
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
              onClick={() => fetchDashboardData(false)}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Interactive Fancy Charts & Telemetry Section */}
        {!loading && !error && (
          <>
            <SuperAdminAnalyticsCharts
              monthlyData={monthly}
              overviewData={overview}
              aiUsageData={aiUsage}
              onRefresh={() => fetchDashboardData(true)}
              isLoading={refreshing}
            />

            {/* Quick Navigation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <Link
                href="/admin/companies"
                className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
                    <Building2 className="size-5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    Tenant Organizations <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inspect registered companies, adjust resource limits, override subscription plans, or approve pending tenants.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>{overview?.total_companies ?? 0} total</span>
                  <span className="text-emerald-500 font-bold">{overview?.active_companies ?? 0} active</span>
                </div>
              </Link>

              <Link
                href="/admin/enterprise-requests"
                className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center mb-3">
                    <Sparkles className="size-5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-foreground group-hover:text-indigo-500 transition-colors flex items-center gap-1.5">
                    Enterprise Inquiries <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review incoming bespoke Enterprise tier requests, calculate dynamic pricing, and approve custom SLAs.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Dynamic Quoting</span>
                  <span className="text-primary font-bold">Review Pipeline</span>
                </div>
              </Link>

              <Link
                href="/admin/audit-logs"
                className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-3">
                    <History className="size-5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-foreground group-hover:text-amber-500 transition-colors flex items-center gap-1.5">
                    Security Audit Trail <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Immutable log of Super Admin administrative actions, company status changes, and limit reallocations.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Cryptographic Log</span>
                  <span className="text-amber-500 font-bold">Audit Ready</span>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </SuperAdminShell>
  );
}

