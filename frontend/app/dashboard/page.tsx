"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  DashboardContextData,
  TaskItem,
  FormatBadge,
  WorkstreamBadge,
  MyActiveTasksWidget,
  CurrentSprintWidget,
  SpecializationWidgetContainer,
  ViewerWorkspaceView,
  TeamLeadWorkspaceView,
  ProjectManagerWorkspaceView,
  OwnerAdminWorkspaceView,
} from "@/components/dashboard/WorkspaceWidgets";
import {
  Loader2,
  AlertCircle,
  FolderKanban,
  Building,
  UserCheck,
  Plus,
  ArrowRight,
  ChevronDown,
  Layers,
} from "lucide-react";

export default function UnifiedDashboardPage() {
  const router = useRouter();

  const [context, setContext] = useState<DashboardContextData | null>(null);
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending Invitations Discovery State
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);

  const fetchPendingInvites = useCallback(async () => {
    try {
      const res = await api.get("/projects/invitations/my-pending");
      setPendingInvites(res.data.data || []);
    } catch {
      // Non-blocking for dashboard
    }
  }, []);

  const handleAcceptPendingInvite = async (invitationId: string) => {
    setAcceptingInviteId(invitationId);
    try {
      const res = await api.post("/projects/invitations/accept", { invitation_id: invitationId });
      const projId = res.data.data.project_id;
      setPendingInvites((prev) => prev.filter((i) => i.id !== invitationId));
      fetchDashboardContext(projId);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept invitation.");
    } finally {
      setAcceptingInviteId(null);
    }
  };

  // Fetch server-driven dashboard context
  const fetchDashboardContext = useCallback(async (targetProjectId?: string) => {
    if (targetProjectId) {
      setContextLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);
    fetchPendingInvites();

    try {
      const url = targetProjectId
        ? `/dashboard/context?project_id=${targetProjectId}`
        : "/dashboard/context";

      const res = await api.get(url);
      const data: DashboardContextData = res.data.data;

      // Super Admin Guard -> Redirect to /admin
      if (data.user.is_super_admin) {
        router.replace("/admin");
        return;
      }

      setContext(data);

      // If active project resolved, fetch active tasks assigned to user
      if (data.active_project?.project_id) {
        try {
          const tasksRes = await api.get(
            `/projects/${data.active_project.project_id}/tasks`
          );
          const allTasks: TaskItem[] = tasksRes.data.data.tasks || [];
          // Filter tasks assigned to current user or active in project
          const myTasks = allTasks.filter(
            (t) => t.assignee_name && t.assignee_name.includes(data.user.first_name)
          );
          setActiveTasks(myTasks.length > 0 ? myTasks : allTasks);
        } catch {
          setActiveTasks([]);
        }
      } else {
        setActiveTasks([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard context.");
    } finally {
      setLoading(false);
      setContextLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardContext();
  }, [fetchDashboardContext]);

  // Handle active project switcher selection
  const handleProjectSwitch = (newProjectId: string) => {
    if (!newProjectId || newProjectId === context?.active_project?.project_id) return;
    fetchDashboardContext(newProjectId);
  };

  const user = context?.user;
  const activeProj = context?.active_project;
  const capabilities = context?.capabilities;
  const companyRole = user?.company_role;
  const projectRole = activeProj?.project_role;
  const specialization = activeProj?.specialization;

  const isOwnerAdmin = companyRole === "OWNER" || companyRole === "ADMIN";
  const isPM = projectRole === "PROJECT_MANAGER";
  const isTeamLead = projectRole === "TEAM_LEAD";
  const isViewer = capabilities?.is_read_only || projectRole === "VIEWER";
  const isDeveloper = !isOwnerAdmin && !isPM && !isTeamLead && !isViewer;

  return (
    <ProtectedShell pageTitle="Unified Workspace Dashboard">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Pending Project Invitation Banner */}
        {pendingInvites.length > 0 && !loading && (
          <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[0.7rem] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                    Pending Invitation
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Action Required
                  </span>
                </div>
                <h4 className="text-base font-bold text-foreground">
                  You have been invited to join <span className="text-primary font-bold">{pendingInvites[0].project_name}</span> at {pendingInvites[0].company_name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Role: <strong className="text-foreground">{pendingInvites[0].project_role}</strong>
                  {pendingInvites[0].specialization && <> | Specialization: <strong className="text-foreground">{pendingInvites[0].specialization}</strong></>}
                  {" "}— Invited by {pendingInvites[0].inviter_name}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  disabled={acceptingInviteId === pendingInvites[0].id}
                  onClick={() => handleAcceptPendingInvite(pendingInvites[0].id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {acceptingInviteId === pendingInvites[0].id && <Loader2 className="size-3.5 animate-spin" />}
                  Accept & Join Workspace
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Loading State Skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">
              Loading server-driven workspace context...
            </p>
          </div>
        )}

        {/* Error Boundary */}
        {error && !loading && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center max-w-lg mx-auto space-y-2">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-base font-bold text-foreground">Workspace Error</h3>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && context && (
          <div className="space-y-6">
            {/* TOP WELCOME BANNER & ACTIVE PROJECT SWITCHER */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <UserCheck className="size-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                        Welcome back, {user?.first_name}!
                      </h2>

                      {companyRole && (
                        <FormatBadge
                          label={`Company: ${companyRole}`}
                          colorClass="bg-primary/10 text-primary border-primary/20"
                        />
                      )}

                      {projectRole && (
                        <FormatBadge
                          label={`Role: ${projectRole}`}
                          colorClass="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        />
                      )}

                      {specialization && (
                        <WorkstreamBadge workstream={specialization} />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {isOwnerAdmin
                        ? "Company Overview, Analytics & Organization Controls."
                        : isPM
                        ? "Managed Projects, Sprint Progress & Deliverables."
                        : isTeamLead
                        ? "Team Workload, Deliverables & Workstream Distribution."
                        : isViewer
                        ? "Read-only Project Workspace & Milestone Overview."
                        : "Assigned Tasks, Active Sprint Work & Specialization Workstation."}
                    </p>
                  </div>
                </div>

                {capabilities?.can_manage_members && (
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="size-4" /> New Project
                  </Link>
                )}
              </div>

              {/* ACTIVE PROJECT CONTEXT SWITCHER DROPDOWN */}
              {context.projects.length > 0 && (
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Building className="size-4 text-primary" />
                    <span>Company: <strong className="text-foreground">{activeProj?.company_name || "Synapse"}</strong></span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-xs font-bold text-muted-foreground">Active Project:</label>
                    <div className="relative">
                      <select
                        value={activeProj?.project_id || ""}
                        onChange={(e) => handleProjectSwitch(e.target.value)}
                        disabled={contextLoading}
                        className="pl-3 pr-8 py-1.5 text-xs font-bold rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50"
                      >
                        {context.projects.map((p) => (
                          <option key={p.project_id} value={p.project_id}>
                            {p.project_name} ({p.project_role}{p.specialization ? ` — ${p.specialization}` : ""})
                          </option>
                        ))}
                      </select>
                      {contextLoading && (
                        <Loader2 className="size-3.5 text-primary animate-spin absolute right-2 top-2.5" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NO ACTIVE PROJECT STATE */}
            {!activeProj && (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                <FolderKanban className="size-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-base font-bold text-foreground">No Authorized Projects Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You are not currently assigned to any project in this organization. Contact your Project Manager or Company Owner for project invitations.
                </p>
              </div>
            )}

            {/* WORKSPACE RENDERING DRIVEN BY ROLE PRECEDENCE FOR ACTIVE PROJECT */}

            {activeProj && (
              <div className="space-y-6">
                {/* 1. VIEWER WORKSPACE (Read-Only) */}
                {isViewer && <ViewerWorkspaceView context={context} />}

                {/* 2. OWNER / ADMIN WORKSPACE */}
                {isOwnerAdmin && <OwnerAdminWorkspaceView context={context} />}

                {/* 3. PROJECT MANAGER WORKSPACE */}
                {isPM && !isOwnerAdmin && <ProjectManagerWorkspaceView context={context} />}

                {/* 4. TEAM LEAD WORKSPACE */}
                {isTeamLead && !isOwnerAdmin && !isPM && (
                  <TeamLeadWorkspaceView context={context} tasks={activeTasks} />
                )}

                {/* 5. DEVELOPER WORKSPACE (Common + Specialization Layer) */}
                {isDeveloper && (
                  <div className="space-y-6">
                    <CurrentSprintWidget metrics={context.metrics} projectId={activeProj.project_id} />
                    <MyActiveTasksWidget tasks={activeTasks} projectId={activeProj.project_id} />
                    <SpecializationWidgetContainer
                      specialization={specialization || null}
                      tasks={activeTasks}
                      projectId={activeProj.project_id}
                    />
                  </div>
                )}

                {/* PROJECTS OVERVIEW GRID FOR ACTIVE CONTEXT */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <FolderKanban className="size-5 text-primary" /> Authorized Workspace Projects ({context.projects.length})
                    </h3>
                    <Link href="/projects" className="text-xs font-bold text-primary hover:underline">
                      View All Projects
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {context.projects.map((p) => {
                      const isCurrent = p.project_id === activeProj.project_id;
                      return (
                        <div
                          key={p.project_id}
                          className={`rounded-xl border p-4 shadow-2xs space-y-3 transition-all ${
                            isCurrent
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-background hover:border-border/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-foreground truncate">{p.project_name}</h4>
                            <FormatBadge
                              label={p.project_role}
                              colorClass={isCurrent ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}
                            />
                          </div>

                          {p.specialization && (
                            <div>
                              <WorkstreamBadge workstream={p.specialization} />
                            </div>
                          )}

                          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                            {isCurrent ? (
                              <span className="font-extrabold text-primary">Active Workspace</span>
                            ) : (
                              <button
                                onClick={() => handleProjectSwitch(p.project_id)}
                                className="font-bold text-primary hover:underline cursor-pointer"
                              >
                                Switch Context
                              </button>
                            )}

                            <Link
                              href={`/projects/${p.project_id}`}
                              className="font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              Project Page <ArrowRight className="size-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
