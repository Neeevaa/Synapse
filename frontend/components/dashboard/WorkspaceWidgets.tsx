"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Zap,
  AlertTriangle,
  Clock,
  Briefcase,
  Activity,
  Layers,
  User,
  Users,
  Building,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Eye,
  FileText,
  Code2,
  Database,
  Cpu,
  Terminal,
  Palette,
  CheckCircle2,
  ExternalLink,
  Plus,
  GitPullRequest,
} from "lucide-react";

/* ─── Interfaces ─── */
export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  workstream: string | null;
  story_points: number | null;
  assignee_name: string | null;
}

export interface DashboardContextData {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    company_role: string | null;
    is_super_admin: boolean;
  };
  projects: Array<{
    project_id: string;
    project_name: string;
    project_role: string;
    specialization: string | null;
  }>;
  active_project: {
    project_id: string;
    project_name: string;
    company_name: string;
    project_role: string;
    specialization: string | null;
  } | null;
  metrics: {
    my_tasks: number;
    overdue_tasks: number;
    story_points: number;
    sprint_progress_percent: number;
    active_sprint_name: string | null;
    blocked_tasks_count: number;
    pending_invitations_count: number;
    total_project_tasks: number;
    completed_project_tasks: number;
  };
  capabilities: {
    can_view_team: boolean;
    can_manage_members: boolean;
    can_assign_tasks: boolean;
    can_manage_sprints: boolean;
    can_edit_tasks: boolean;
    can_view_reports: boolean;
    is_read_only: boolean;
  };
}

/* ─── HELPER BADGES ─── */
export function FormatBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${colorClass}`}>
      {label}
    </span>
  );
}

export function WorkstreamBadge({ workstream }: { workstream: string | null }) {
  const ws = workstream || "GENERAL";
  const styles: Record<string, { label: string; style: string }> = {
    GENERAL: { label: "General", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
    DESIGN: { label: "UI/UX", style: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
    UI_UX: { label: "UI/UX", style: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
    FRONTEND: { label: "Frontend", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    BACKEND: { label: "Backend", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    QA: { label: "QA", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    QA_TESTING: { label: "QA", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    DEVOPS: { label: "DevOps", style: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
    AI_ML: { label: "AI/ML", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  };
  const target = styles[ws] || styles.GENERAL;
  return <FormatBadge label={target.label} colorClass={target.style} />;
}

/* ─── BASE DEVELOPER WORKSPACE WIDGETS ─── */

export function MyActiveTasksWidget({ tasks, projectId }: { tasks: TaskItem[]; projectId: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <CheckSquare className="size-5 text-primary" /> My Active Assigned Tasks ({tasks.length})
        </h3>
        <Link
          href={`/projects/${projectId}/board`}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          Open Execution Board <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground italic">
          No active tasks currently assigned to you in this project.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className="p-3.5 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <WorkstreamBadge workstream={task.workstream} />
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-extrabold uppercase border ${
                      task.priority === "URGENT"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : task.priority === "HIGH"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {task.priority}
                  </span>
                  <h4 className="text-xs font-bold text-foreground truncate">{task.title}</h4>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
                  {task.status}
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {task.story_points !== null ? `${task.story_points} pts` : "Unestimated"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CurrentSprintWidget({ metrics, projectId }: { metrics: DashboardContextData["metrics"]; projectId: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="size-5 text-emerald-500" /> Active Sprint Workstation
        </h3>
        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {metrics.active_sprint_name || "No Active Sprint"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-xs font-bold text-muted-foreground block uppercase">Sprint Progress</span>
          <span className="text-xl font-extrabold text-foreground mt-1 block">
            {metrics.sprint_progress_percent}%
          </span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-xs font-bold text-muted-foreground block uppercase">My Active Tasks</span>
          <span className="text-xl font-extrabold text-foreground mt-1 block">
            {metrics.my_tasks}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-xs font-bold text-muted-foreground block uppercase">Story Points Sum</span>
          <span className="text-xl font-extrabold text-foreground mt-1 block">
            {metrics.story_points} pts
          </span>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-xs font-bold text-muted-foreground block uppercase">Blocked / Urgent</span>
          <span className="text-xl font-extrabold text-destructive mt-1 block">
            {metrics.blocked_tasks_count}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── SPECIALIZATION-SPECIFIC WIDGETS ─── */

export function SpecializationWidgetContainer({
  specialization,
  tasks,
  projectId,
}: {
  specialization: string | null;
  tasks: TaskItem[];
  projectId: string;
}) {
  const spec = specialization || "GENERAL";

  // Filter tasks matching task category / workstream
  const specTasks = tasks.filter((t) => {
    const ws = t.workstream || "GENERAL";
    if (spec === "FRONTEND" && (ws === "FRONTEND" || ws === "UI_UX")) return true;
    if (spec === "BACKEND" && (ws === "BACKEND" || ws === "GENERAL")) return true;
    if (spec === "AI_ML" && ws === "AI_ML") return true;
    if (spec === "QA_TESTING" && ws === "QA") return true;
    if (spec === "DEVOPS" && ws === "DEVOPS") return true;
    if (spec === "DESIGN" && (ws === "DESIGN" || ws === "UI_UX")) return true;
    return ws === spec || ws === "GENERAL";
  });

  switch (spec) {
    case "FRONTEND":
      return (
        <div className="rounded-2xl border border-blue-500/20 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Code2 className="size-5 text-blue-500" /> Frontend Engineering Workstation
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
              {specTasks.length} Frontend Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">UI Components & Bugs</span>
              <span className="text-lg font-extrabold text-foreground">{specTasks.length} Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">API Dependency Status</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">Endpoints Ready</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Code Review Queue</span>
              <span className="text-lg font-extrabold text-foreground">0 Pending Reviews</span>
            </div>
          </div>

          {specTasks.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-foreground block">Assigned UI/Frontend Items:</span>
              <div className="space-y-2">
                {specTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground truncate">{t.title}</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case "BACKEND":
      return (
        <div className="rounded-2xl border border-purple-500/20 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Database className="size-5 text-purple-500" /> Backend Systems Workstation
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20">
              {specTasks.length} Backend Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">API Endpoints & Integration</span>
              <span className="text-lg font-extrabold text-foreground">{specTasks.length} Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Database Migrations</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">PostgreSQL Schema Synced</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">PR & Code Reviews</span>
              <span className="text-lg font-extrabold text-foreground">0 Pending Reviews</span>
            </div>
          </div>

          {specTasks.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-foreground block">Backend & API Tasks:</span>
              <div className="space-y-2">
                {specTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground truncate">{t.title}</span>
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case "AI_ML":
      return (
        <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Cpu className="size-5 text-emerald-500" /> AI / ML Engineering Workstation
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {specTasks.length} AI Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Model & Data Tasks</span>
              <span className="text-lg font-extrabold text-foreground">{specTasks.length} Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Provider Status</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">OpenAI Provider Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Evaluation Pipeline</span>
              <span className="text-lg font-extrabold text-foreground">Standard Evaluation Matrix</span>
            </div>
          </div>
        </div>
      );

    case "QA_TESTING":
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-5 text-amber-500" /> Quality Assurance & Testing Workstation
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {specTasks.length} Test Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Assigned Test Tasks</span>
              <span className="text-lg font-extrabold text-foreground">{specTasks.length} Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Regression Testing Status</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">Test Matrix Passing</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Verification Suite</span>
              <span className="text-lg font-extrabold text-foreground">124+ Automated Checks</span>
            </div>
          </div>
        </div>
      );

    case "DEVOPS":
      return (
        <div className="rounded-2xl border border-cyan-500/20 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Terminal className="size-5 text-cyan-500" /> DevOps & Infrastructure Workstation
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
              {specTasks.length} Infrastructure Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Deployment Tasks</span>
              <span className="text-lg font-extrabold text-foreground">{specTasks.length} Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Environment Status</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">Production Operational</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Build Pipelines</span>
              <span className="text-lg font-extrabold text-foreground">Next.js Turbopack Passing</span>
            </div>
          </div>
        </div>
      );

    case "DESIGN":
      return (
        <div className="rounded-2xl border border-pink-500/20 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Palette className="size-5 text-pink-500" /> UI / UX Design Workstation
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-600 border border-pink-500/20">
              {specTasks.length} Design Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">UI/UX Design Tasks</span>
              <span className="text-lg font-extrabold text-foreground">{specTasks.length} Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Design System Palette</span>
              <span className="text-lg font-extrabold text-foreground">Ocean Slate Active</span>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase block">UX Prototype Reviews</span>
              <span className="text-lg font-extrabold text-foreground">0 Pending Reviews</span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Briefcase className="size-5 text-primary" /> General Engineering Workstation
            </h3>
            <span className="text-xs font-bold px-2 py-1 rounded bg-muted text-muted-foreground">
              {specTasks.length} Tasks
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Standard project workspace overview.
          </div>
        </div>
      );
  }
}

/* ─── ROLE-SPECIFIC WORKSPACE VIEWS ─── */

export function ViewerWorkspaceView({ context }: { context: DashboardContextData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Eye className="size-5 text-primary" /> Read-Only Project Workspace
          </h3>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            Viewer Access (Read-Only)
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          You have read-only access to <strong>{context.active_project?.project_name}</strong>. Administrative actions, task assignment, and sprint modifications are restricted.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-background border border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase block">Project Status</span>
            <span className="text-lg font-extrabold text-foreground mt-1 block">Active</span>
          </div>
          <div className="p-4 rounded-xl bg-background border border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase block">Total Tasks</span>
            <span className="text-lg font-extrabold text-foreground mt-1 block">
              {context.metrics.total_project_tasks}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-background border border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase block">Completed Tasks</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {context.metrics.completed_project_tasks}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamLeadWorkspaceView({ context, tasks }: { context: DashboardContextData; tasks: TaskItem[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Team Deliverables</span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">
            {context.metrics.total_project_tasks} Items
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Sprint Progress</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {context.metrics.sprint_progress_percent}% Complete
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Blocked Tasks</span>
          <span className="text-2xl font-extrabold text-destructive mt-1 block">
            {context.metrics.blocked_tasks_count} Blockers
          </span>
        </div>
      </div>

      <MyActiveTasksWidget tasks={tasks} projectId={context.active_project?.project_id || ""} />
      <SpecializationWidgetContainer
        specialization={context.active_project?.specialization || "GENERAL"}
        tasks={tasks}
        projectId={context.active_project?.project_id || ""}
      />
    </div>
  );
}

export function ProjectManagerWorkspaceView({ context }: { context: DashboardContextData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Managed Projects</span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">{context.projects.length}</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Active Sprint Progress</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {context.metrics.sprint_progress_percent}%
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Pending Invitations</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
            {context.metrics.pending_invitations_count}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Blocked Tasks</span>
          <span className="text-2xl font-extrabold text-destructive mt-1 block">
            {context.metrics.blocked_tasks_count} Blockers
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-2xs">
        <div>
          <h4 className="text-sm font-bold text-foreground">Project Management Quick Actions</h4>
          <p className="text-xs text-muted-foreground">Manage project members, sprint capacity, and backlog prioritization.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${context.active_project?.project_id}/backlog`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/95"
          >
            Open Backlog <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function OwnerAdminWorkspaceView({ context }: { context: DashboardContextData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Company Projects</span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">{context.projects.length}</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Organization Status</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">100% Operational</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Company Role</span>
          <span className="text-2xl font-extrabold text-foreground mt-1 block">
            {context.user.company_role || "ADMIN"}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Subscription Entitlement</span>
          <span className="text-2xl font-extrabold text-primary mt-1 block">Active</span>
        </div>
      </div>
    </div>
  );
}
