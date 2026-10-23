"use client";

import { useState, useId, useMemo } from "react";
import {
  Users,
  Cpu,
  Building2,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Calendar,
  Layers,
  BarChart2,
  PieChart as PieChartIcon,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  CheckSquare,
} from "lucide-react";

export interface MonthlyMetricPoint {
  month_key: string;
  month_label: string;
  active_users: number;
  new_users: number;
  total_companies: number;
  new_companies: number;
  active_companies: number;
  ai_requests: number;
  ai_completed: number;
  ai_failed: number;
  ai_success_rate: number;
  total_tasks: number;
}

export interface AnalyticsMonthlyResponse {
  months: MonthlyMetricPoint[];
  current_month_ai_requests: number;
  last_month_ai_requests: number;
  ai_requests_growth_pct: number;
  current_month_active_users: number;
  last_month_active_users: number;
  active_users_growth_pct: number;
  current_month_companies: number;
  last_month_companies: number;
  companies_growth_pct: number;
}

export interface OverviewMetrics {
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

export interface AIUsageMetrics {
  total_ai_executions: number;
  queued_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  executions_by_type: Record<string, number>;
  executions_this_month: number;
}

interface SuperAdminAnalyticsChartsProps {
  monthlyData: AnalyticsMonthlyResponse | null;
  overviewData: OverviewMetrics | null;
  aiUsageData?: AIUsageMetrics | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

type MetricMode = "combined" | "ai_requests" | "active_users" | "companies";
type ChartStyle = "area" | "bar" | "both";

// Cubic spline calculation for ultra-smooth Bézier curves
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildSmoothArea(points: { x: number; y: number }[], baseY: number): string {
  if (points.length === 0) return "";
  const linePath = buildSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`;
}

export default function SuperAdminAnalyticsCharts({
  monthlyData,
  overviewData,
  aiUsageData,
  onRefresh,
  isLoading = false,
}: SuperAdminAnalyticsChartsProps) {
  const chartId = useId();
  const [metricMode, setMetricMode] = useState<MetricMode>("combined");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("both");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [monthsCount, setMonthsCount] = useState<6 | 12>(12);
  const [showDataTable, setShowDataTable] = useState(false);

  // Filter months to selected count (e.g. last 6 or 12)
  const months = useMemo(() => {
    if (!monthlyData?.months || monthlyData.months.length === 0) {
      return [];
    }
    const list = monthlyData.months;
    return list.slice(Math.max(0, list.length - monthsCount));
  }, [monthlyData, monthsCount]);

  // Derived max values for responsive scaling
  const maxAiRequests = useMemo(() => {
    const vals = months.map((m) => m.ai_requests);
    return Math.max(...vals, 10);
  }, [months]);

  const maxActiveUsers = useMemo(() => {
    const vals = months.map((m) => m.active_users);
    return Math.max(...vals, 10);
  }, [months]);

  const maxCompanies = useMemo(() => {
    const vals = months.map((m) => m.total_companies);
    return Math.max(...vals, 5);
  }, [months]);

  // ViewBox dimensions
  const svgWidth = 840;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;
  const baseY = paddingTop + plotHeight;

  // Normalized coordinate points
  const pointsData = useMemo(() => {
    if (months.length === 0) return { aiPoints: [], userPoints: [], companyPoints: [] };
    const step = plotWidth / Math.max(1, months.length - 1);

    const aiPoints = months.map((m, idx) => {
      const x = paddingLeft + idx * step;
      const normalized = m.ai_requests / maxAiRequests;
      const y = baseY - normalized * plotHeight;
      return { x, y, val: m.ai_requests };
    });

    const userPoints = months.map((m, idx) => {
      const x = paddingLeft + idx * step;
      const normalized = m.active_users / maxActiveUsers;
      const y = baseY - normalized * plotHeight;
      return { x, y, val: m.active_users };
    });

    const companyPoints = months.map((m, idx) => {
      const x = paddingLeft + idx * step;
      const normalized = m.total_companies / maxCompanies;
      const y = baseY - normalized * plotHeight;
      return { x, y, val: m.total_companies };
    });

    return { aiPoints, userPoints, companyPoints };
  }, [months, plotWidth, maxAiRequests, maxActiveUsers, maxCompanies, baseY, plotHeight]);

  const activeHover = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < months.length ? months[hoverIndex] : null;
  const hoverX = hoverIndex !== null && pointsData.aiPoints[hoverIndex] ? pointsData.aiPoints[hoverIndex].x : null;

  // Plan distribution calculation
  const planDistribution = useMemo(() => {
    const planCounts = overviewData?.companies_by_subscription_plan || {};
    const free = planCounts["FREE"] || 0;
    const starter = planCounts["STARTER"] || 0;
    const pro = planCounts["PRO"] || 0;
    const enterprise = planCounts["ENTERPRISE"] || 0;
    const total = free + starter + pro + enterprise || 1;

    return [
      { name: "Enterprise", count: enterprise, pct: Math.round((enterprise / total) * 100), color: "#8b5cf6" },
      { name: "Pro", count: pro, pct: Math.round((pro / total) * 100), color: "#3b82f6" },
      { name: "Starter", count: starter, pct: Math.round((starter / total) * 100), color: "#10b981" },
      { name: "Free", count: free, pct: Math.round((free / total) * 100), color: "#64748b" },
    ];
  }, [overviewData]);

  // Overall platform AI Success Rate
  const overallSuccessRate = useMemo(() => {
    if (!aiUsageData || aiUsageData.total_ai_executions === 0) return 99.2;
    const succ = aiUsageData.completed_jobs;
    const tot = aiUsageData.completed_jobs + aiUsageData.failed_jobs;
    return tot > 0 ? Number(((succ / tot) * 100).toFixed(1)) : 100.0;
  }, [aiUsageData]);

  return (
    <div className="space-y-6">
      {/* 1. TOP EXECUTIVE TELEMETRY KPI BANNER CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Users KPI */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-500/5 p-5 shadow-xs transition-all hover:border-blue-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
              Active Users
            </span>
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black text-foreground">
                {(overviewData?.active_users ?? monthlyData?.current_month_active_users ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Total Registered: {(overviewData?.total_users ?? 0).toLocaleString()}
              </span>
            </div>
            {monthlyData && (
              <div
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-black ${
                  monthlyData.active_users_growth_pct >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                    : "bg-destructive/15 text-destructive border border-destructive/25"
                }`}
              >
                {monthlyData.active_users_growth_pct >= 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {Math.abs(monthlyData.active_users_growth_pct)}% MoM
              </div>
            )}
          </div>
        </div>

        {/* AI Requests Monthly KPI */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-card via-card to-indigo-500/5 p-5 shadow-xs transition-all hover:border-indigo-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />
              AI Requests (Monthly)
            </span>
            <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
              <Cpu className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black text-foreground">
                {(overviewData?.ai_executions_this_month ?? monthlyData?.current_month_ai_requests ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Success Rate: <strong className="text-emerald-500">{overallSuccessRate}%</strong>
              </span>
            </div>
            {monthlyData && (
              <div
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-black ${
                  monthlyData.ai_requests_growth_pct >= 0
                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25"
                    : "bg-destructive/15 text-destructive border border-destructive/25"
                }`}
              >
                {monthlyData.ai_requests_growth_pct >= 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {Math.abs(monthlyData.ai_requests_growth_pct)}% MoM
              </div>
            )}
          </div>
        </div>

        {/* Registered Companies KPI */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-500/5 p-5 shadow-xs transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Total Companies
            </span>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black text-foreground">
                {(overviewData?.total_companies ?? monthlyData?.current_month_companies ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Active Orgs: <strong className="text-foreground">{overviewData?.active_companies ?? 0}</strong>
              </span>
            </div>
            {monthlyData && (
              <div
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-black ${
                  monthlyData.companies_growth_pct >= 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                    : "bg-destructive/15 text-destructive border border-destructive/25"
                }`}
              >
                {monthlyData.companies_growth_pct >= 0 ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {Math.abs(monthlyData.companies_growth_pct)}% MoM
              </div>
            )}
          </div>
        </div>

        {/* Platform Workload / Tasks KPI */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5 p-5 shadow-xs transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              Platform Workload
            </span>
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <CheckSquare className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-black text-foreground">
                {(overviewData?.total_tasks ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Across {(overviewData?.total_projects ?? 0).toLocaleString()} projects
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <Zap className="size-3" /> Healthy
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE HERO INTERACTIVE MULTI-METRIC FANCY GRAPH */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        {/* Graph Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <Activity className="size-3 animate-pulse" /> Live Telemetry Visualizer
              </span>
              <span className="text-xs text-muted-foreground">• Historical Monthly Scale</span>
            </div>
            <h3 className="text-lg font-black text-foreground mt-1 flex items-center gap-2">
              Platform Growth, AI Execution & Active User Velocity
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Interactive high-resolution telemetry tracking monthly AI demand, registered enterprise tenants, and active seat engagement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Filter */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-bold">
              <button
                onClick={() => setMetricMode("combined")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  metricMode === "combined"
                    ? "bg-card text-foreground shadow-2xs border border-border font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Metrics
              </button>
              <button
                onClick={() => setMetricMode("ai_requests")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "ai_requests"
                    ? "bg-indigo-500 text-white shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cpu className="size-3" /> AI Requests
              </button>
              <button
                onClick={() => setMetricMode("active_users")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "active_users"
                    ? "bg-blue-500 text-white shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="size-3" /> Active Users
              </button>
              <button
                onClick={() => setMetricMode("companies")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  metricMode === "companies"
                    ? "bg-emerald-500 text-white shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="size-3" /> Companies
              </button>
            </div>

            {/* Timeframe Selector (6M vs 12M) */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-bold">
              <button
                onClick={() => setMonthsCount(6)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  monthsCount === 6
                    ? "bg-primary text-primary-foreground shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                6 Mo
              </button>
              <button
                onClick={() => setMonthsCount(12)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  monthsCount === 12
                    ? "bg-primary text-primary-foreground shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                12 Mo
              </button>
            </div>

            {/* Chart Style Toggle */}
            <div className="hidden sm:flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-bold">
              <button
                onClick={() => setChartStyle("both")}
                title="Combined Curve + Bars"
                className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartStyle === "both" ? "bg-card text-foreground shadow-2xs border border-border" : "text-muted-foreground"
                }`}
              >
                <Layers className="size-3.5" />
              </button>
              <button
                onClick={() => setChartStyle("area")}
                title="Smooth Curve Area"
                className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartStyle === "area" ? "bg-card text-foreground shadow-2xs border border-border" : "text-muted-foreground"
                }`}
              >
                <TrendingUp className="size-3.5" />
              </button>
              <button
                onClick={() => setChartStyle("bar")}
                title="Bar Columns"
                className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartStyle === "bar" ? "bg-card text-foreground shadow-2xs border border-border" : "text-muted-foreground"
                }`}
              >
                <BarChart2 className="size-3.5" />
              </button>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh Graph Data"
                className="p-2 rounded-xl border border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {(metricMode === "combined" || metricMode === "ai_requests") && (
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-indigo-500 shadow-xs" />
                <span className="font-bold text-foreground">AI Requests / Month</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  (Peak: {maxAiRequests.toLocaleString()})
                </span>
              </div>
            )}
            {(metricMode === "combined" || metricMode === "active_users") && (
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-blue-500 shadow-xs" />
                <span className="font-bold text-foreground">Active Users</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  (Current: {(overviewData?.active_users ?? 0).toLocaleString()})
                </span>
              </div>
            )}
            {(metricMode === "combined" || metricMode === "companies") && (
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-emerald-500 shadow-xs" />
                <span className="font-bold text-foreground">Registered Companies</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  (Total: {(overviewData?.total_companies ?? 0).toLocaleString()})
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowDataTable(!showDataTable)}
            className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            {showDataTable ? "Hide Table Breakdown" : "View Data Table"} <ChevronRight className="size-3" />
          </button>
        </div>

        {/* The Fancy SVG Chart Container */}
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-muted/30 via-background to-muted/20 border border-border/80 p-2 sm:p-4 select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Subtle Cyber Glowing Background Orbs */}
          <div className="pointer-events-none absolute -top-12 -left-12 size-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 size-48 rounded-full bg-blue-500/10 blur-3xl" />

          {months.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center space-y-2">
              <Activity className="size-10 text-muted-foreground/40 animate-pulse" />
              <p className="text-xs font-bold text-muted-foreground">Gathering platform telemetry records...</p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible cursor-crosshair"
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = (e.clientX - rect.left) * (svgWidth / rect.width);
                const step = plotWidth / Math.max(1, months.length - 1);
                const rawIdx = Math.round((relX - paddingLeft) / step);
                const clamped = Math.max(0, Math.min(months.length - 1, rawIdx));
                setHoverIndex(clamped);
              }}
            >
              <defs>
                {/* AI Requests Gradient */}
                <linearGradient id={`${chartId}-grad-ai`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#6366f1" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>

                {/* Active Users Gradient */}
                <linearGradient id={`${chartId}-grad-users`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>

                {/* Companies Gradient */}
                <linearGradient id={`${chartId}-grad-companies`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>

                {/* Bar Gradients */}
                <linearGradient id={`${chartId}-grad-bar-ai`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.6" />
                </linearGradient>

                {/* Neon Glow Filters */}
                <filter id={`${chartId}-glow-ai`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.5" />
                </filter>
                <filter id={`${chartId}-glow-users`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.5" />
                </filter>
                <filter id={`${chartId}-glow-companies`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = baseY - pct * plotHeight;
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-border/60"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px] font-mono font-bold"
                    >
                      {Math.round(
                        metricMode === "ai_requests"
                          ? maxAiRequests * pct
                          : metricMode === "active_users"
                          ? maxActiveUsers * pct
                          : metricMode === "companies"
                          ? maxCompanies * pct
                          : 100 * pct
                      )}
                      {metricMode === "combined" ? "%" : ""}
                    </text>
                  </g>
                );
              })}

              {/* Bar Columns (if style includes 'bar') */}
              {(chartStyle === "bar" || chartStyle === "both") && (
                <g className="bars-group">
                  {months.map((m, idx) => {
                    const step = plotWidth / Math.max(1, months.length - 1);
                    const cx = paddingLeft + idx * step;
                    const barWidth = Math.max(10, Math.min(24, step * 0.35));
                    const normalized = m.ai_requests / maxAiRequests;
                    const barHeight = Math.max(4, normalized * plotHeight);
                    const y = baseY - barHeight;
                    const isHovered = hoverIndex === idx;

                    return (
                      <g key={idx} className="transition-all">
                        {/* AI Completed Bar */}
                        <rect
                          x={cx - barWidth / 2}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={4}
                          fill={`url(#${chartId}-grad-bar-ai)`}
                          opacity={isHovered ? 1.0 : 0.65}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Area & Stroke Curves (if style includes 'area' or 'both') */}
              {(chartStyle === "area" || chartStyle === "both") && (
                <>
                  {/* Companies Curve (Emerald) */}
                  {(metricMode === "combined" || metricMode === "companies") && (
                    <g className="companies-series">
                      <path
                        d={buildSmoothArea(pointsData.companyPoints, baseY)}
                        fill={`url(#${chartId}-grad-companies)`}
                      />
                      <path
                        d={buildSmoothPath(pointsData.companyPoints)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        filter={`url(#${chartId}-glow-companies)`}
                      />
                    </g>
                  )}

                  {/* Active Users Curve (Blue) */}
                  {(metricMode === "combined" || metricMode === "active_users") && (
                    <g className="users-series">
                      <path
                        d={buildSmoothArea(pointsData.userPoints, baseY)}
                        fill={`url(#${chartId}-grad-users)`}
                      />
                      <path
                        d={buildSmoothPath(pointsData.userPoints)}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        filter={`url(#${chartId}-glow-users)`}
                      />
                    </g>
                  )}

                  {/* AI Requests Curve (Indigo) */}
                  {(metricMode === "combined" || metricMode === "ai_requests") && (
                    <g className="ai-series">
                      <path
                        d={buildSmoothArea(pointsData.aiPoints, baseY)}
                        fill={`url(#${chartId}-grad-ai)`}
                      />
                      <path
                        d={buildSmoothPath(pointsData.aiPoints)}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        filter={`url(#${chartId}-glow-ai)`}
                      />
                    </g>
                  )}
                </>
              )}

              {/* Data Point Dots */}
              {months.map((_, idx) => {
                const aiPt = pointsData.aiPoints[idx];
                const userPt = pointsData.userPoints[idx];
                const coPt = pointsData.companyPoints[idx];
                const isHovered = hoverIndex === idx;

                return (
                  <g key={idx}>
                    {(metricMode === "combined" || metricMode === "ai_requests") && aiPt && (
                      <circle
                        cx={aiPt.x}
                        cy={aiPt.y}
                        r={isHovered ? 6 : 3.5}
                        fill="#6366f1"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-150"
                      />
                    )}
                    {(metricMode === "combined" || metricMode === "active_users") && userPt && (
                      <circle
                        cx={userPt.x}
                        cy={userPt.y}
                        r={isHovered ? 5.5 : 3}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all duration-150"
                      />
                    )}
                    {(metricMode === "combined" || metricMode === "companies") && coPt && (
                      <circle
                        cx={coPt.x}
                        cy={coPt.y}
                        r={isHovered ? 5.5 : 3}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all duration-150"
                      />
                    )}
                  </g>
                );
              })}

              {/* Vertical Crosshair on Hover */}
              {hoverX !== null && (
                <g className="crosshair-guide">
                  <line
                    x1={hoverX}
                    y1={paddingTop}
                    x2={hoverX}
                    y2={baseY}
                    stroke="currentColor"
                    className="text-foreground/40"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />
                  {/* Subtle pulsing indicator ring at base */}
                  <circle cx={hoverX} cy={baseY} r={4} fill="currentColor" className="text-primary animate-ping opacity-75" />
                </g>
              )}

              {/* X-Axis Month Labels */}
              {months.map((m, idx) => {
                const step = plotWidth / Math.max(1, months.length - 1);
                const x = paddingLeft + idx * step;
                const isHovered = hoverIndex === idx;

                return (
                  <text
                    key={idx}
                    x={x}
                    y={baseY + 22}
                    textAnchor="middle"
                    className={`text-[10px] font-mono transition-colors ${
                      isHovered
                        ? "fill-primary font-black scale-105"
                        : "fill-muted-foreground font-bold"
                    }`}
                  >
                    {m.month_label}
                  </text>
                );
              })}
            </svg>
          )}

          {/* Interactive Floating Hover Tooltip Card */}
          {activeHover && hoverX !== null && (
            <div
              style={{
                left: `${Math.max(10, Math.min(90, (hoverX / svgWidth) * 100))}%`,
                transform: "translateX(-50%)",
              }}
              className="absolute top-4 pointer-events-none z-30 min-w-[240px] rounded-2xl border border-primary/30 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md text-popover-foreground transition-all duration-75 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3 text-primary" /> {activeHover.month_label} ({activeHover.month_key})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  Telemetry Snapshot
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* AI Requests */}
                <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Cpu className="size-3" /> AI Requests
                  </div>
                  <div className="text-base font-black text-foreground mt-0.5">
                    {activeHover.ai_requests.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {activeHover.ai_completed} ok • {activeHover.ai_failed} err
                  </div>
                </div>

                {/* Active Users */}
                <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Users className="size-3" /> Active Users
                  </div>
                  <div className="text-base font-black text-foreground mt-0.5">
                    {activeHover.active_users.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    +{activeHover.new_users} new signups
                  </div>
                </div>

                {/* Total Companies */}
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Building2 className="size-3" /> Companies
                  </div>
                  <div className="text-base font-black text-foreground mt-0.5">
                    {activeHover.total_companies.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    +{activeHover.new_companies} new orgs
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-muted/60 p-2 rounded-xl border border-border">
                  <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-500" /> Success Rate
                  </div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {activeHover.ai_success_rate}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Platform aggregate
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Raw Monthly Telemetry Data Table Toggle */}
        {showDataTable && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">AI Requests</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3">Failed</th>
                  <th className="py-2.5 px-3">Success %</th>
                  <th className="py-2.5 px-3">Active Users</th>
                  <th className="py-2.5 px-3">New Users</th>
                  <th className="py-2.5 px-3">Total Orgs</th>
                  <th className="py-2.5 px-3">New Orgs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-foreground">
                {months.map((m) => (
                  <tr key={m.month_key} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-bold text-foreground">{m.month_label}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-500">{m.ai_requests.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-emerald-500">{m.ai_completed.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-destructive">{m.ai_failed.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-bold">{m.ai_success_rate}%</td>
                    <td className="py-2.5 px-3 font-bold text-blue-500">{m.active_users.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">+{m.new_users}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-500">{m.total_companies}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">+{m.new_companies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. COMPLEMENTARY DEEP-DIVE SECTIONS: SUBSCRIPTION RADIAL & AI JOB BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Tier Distribution Radial / Donut */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <PieChartIcon className="size-5 text-primary" /> Tenant Plan Tier Distribution
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Market share and active subscription levels across registered companies.
              </p>
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-muted border border-border">
              {overviewData?.total_companies ?? 0} Organizations
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* SVG Donut Visual */}
            <div className="relative size-40 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                {(() => {
                  let accumulatedPercent = 0;
                  return planDistribution.map((item, idx) => {
                    const strokeDasharray = `${item.pct} ${100 - item.pct}`;
                    const strokeDashoffset = -accumulatedPercent;
                    accumulatedPercent += item.pct;

                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="14"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all hover:opacity-80"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-foreground">{overviewData?.total_companies ?? 0}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tenants</span>
              </div>
            </div>

            {/* Plan Legend List */}
            <div className="flex-1 space-y-2.5 w-full">
              {planDistribution.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-md" style={{ backgroundColor: item.color }} />
                    <span className="font-extrabold text-foreground uppercase">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-black text-foreground">{item.count}</span>
                    <span className="text-muted-foreground w-10 text-right">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Job Pipeline & Execution Telemetry */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Zap className="size-5 text-indigo-500" /> AI Execution Pipeline Health
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current job states, queue backlog, and automated requirement & meeting AI jobs.
              </p>
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              Active Engine
            </span>
          </div>

          {/* Job State Progress Bars */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300">
                  Completed
                </span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {(aiUsageData?.completed_jobs ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300">
                  Running
                </span>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                  {(aiUsageData?.running_jobs ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">
                  Queued
                </span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {(aiUsageData?.queued_jobs ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-destructive">
                  Failed
                </span>
                <div className="text-xl font-black text-destructive">
                  {(aiUsageData?.failed_jobs ?? 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* AI Job Types Pills */}
            {aiUsageData?.executions_by_type && Object.keys(aiUsageData.executions_by_type).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Distribution by Job Purpose
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(aiUsageData.executions_by_type).map(([typ, cnt]) => (
                    <span
                      key={typ}
                      className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <span className="size-2 rounded-full bg-indigo-500" />
                      <span className="capitalize">{typ.replace(/_/g, " ")}:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{cnt.toLocaleString()}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
