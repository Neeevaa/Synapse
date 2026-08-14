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
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface PlatformStats {
  total_companies: number;
  total_users: number;
  total_projects: number;
  total_tasks: number;
}

export default function SuperAdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/admin/stats");
        setStats(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load platform statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <SuperAdminShell pageTitle="Platform Overview">
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="size-48 text-primary" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
              Platform Administration
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">
              System Control & Analytics
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Global overview of Synapse platform metrics. Monitor companies, registered accounts, active projects, and system-wide task execution.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        {!loading && !error && stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Companies */}
              <div className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Total Companies
                  </span>
                  <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                    <Building2 className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-foreground">
                    {stats.total_companies}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Registered tenant organizations
                  </span>
                </div>
              </div>

              {/* Total Users */}
              <div className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Total Users
                  </span>
                  <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <Users className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-foreground">
                    {stats.total_users}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Registered user accounts
                  </span>
                </div>
              </div>

              {/* Total Projects */}
              <div className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Total Projects
                  </span>
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <FolderKanban className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-foreground">
                    {stats.total_projects}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Active & archived projects
                  </span>
                </div>
              </div>

              {/* Total Tasks */}
              <div className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Total Tasks
                  </span>
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <CheckSquare className="size-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-foreground">
                    {stats.total_tasks}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Total backlog & sprint tasks
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Link to Company Management */}
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Company & Subscription Management
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Inspect tenant organizations, manage subscription tiers (FREE, PRO, TEAM, ENTERPRISE), and suspend or activate companies.
                </p>
              </div>

              <Link
                href="/admin/companies"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-opacity shrink-0"
              >
                <span>Manage Companies</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </SuperAdminShell>
  );
}
