"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import { formatRoleLabel } from "@/lib/roleUtils";
import {
  FolderKanban,
  CheckSquare,
  Users,
  Zap,
  ArrowRight,
  Plus,
  Loader2,
  AlertCircle,
  UserCheck,
  Building,
  Activity,
  ShieldCheck,
  BarChart3,
  GitPullRequest,
  Eye,
  AlertTriangle,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  creator_name: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_role?: string;
  project_roles?: string[];
  designation?: string | null;
}

export default function UnifiedDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, projectsRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/projects"),
      ]);
      setUser(userRes.data.data);
      setProjects(projectsRes.data.data.projects);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const companyRole = user?.company_role || user?.role;
  const isOwner = companyRole === "OWNER";
  const isAdmin = companyRole === "ADMIN";
  const projectRoles = user?.project_roles || [];
  const isPM = projectRoles.includes("PROJECT_MANAGER");
  const isDeveloper = projectRoles.includes("DEVELOPER") || (!isOwner && !isAdmin && !isPM && !projectRoles.includes("VIEWER"));
  const isViewer = projectRoles.includes("VIEWER");

  return (
    <ProtectedShell pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && user && (
          <>
            {/* Header Banner */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-2xs dark:bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="size-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground">
                        Welcome back, {user.first_name}!
                      </h2>
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        {formatRoleLabel(companyRole)}
                      </span>
                      {user.designation && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          {user.designation}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isOwner
                        ? "Organization Overview, Company Analytics & Project Controls."
                        : isAdmin
                        ? "Organization Overview, Project Statistics & Team Controls."
                        : isPM
                        ? "Managed Projects, Sprint Progress & Deliverables."
                        : isViewer
                        ? "Read-only Project Overview & Status Updates."
                        : "Assigned Tasks, Active Sprint Work & Code Reviews."}
                    </p>
                  </div>
                </div>

                {(isOwner || isAdmin || isPM) && (
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/95 shrink-0"
                  >
                    <Plus className="size-4" /> New Project
                  </Link>
                )}
              </div>
            </div>

            {/* DYNAMIC WIDGETS BY ROLE */}

            {/* 1. OWNER WIDGETS */}
            {isOwner && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Company Projects
                    </span>
                    <Building className="size-4 text-primary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">{projects.length}</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Organization Analytics
                    </span>
                    <BarChart3 className="size-4 text-secondary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">100% Operational</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Team Management
                    </span>
                    <Users className="size-4 text-emerald-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">Active</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      AI System Health
                    </span>
                    <Zap className="size-4 text-amber-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">Healthy</div>
                </div>
              </div>
            )}

            {/* 2. ADMIN WIDGETS */}
            {isAdmin && !isOwner && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Project Statistics
                    </span>
                    <Building className="size-4 text-primary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">{projects.length} Total</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Team Controls
                    </span>
                    <ShieldCheck className="size-4 text-emerald-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">Admin Access</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Platform Status
                    </span>
                    <Activity className="size-4 text-secondary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">Active</div>
                </div>
              </div>
            )}

            {/* 3. PROJECT MANAGER WIDGETS */}
            {isPM && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Managed Projects
                    </span>
                    <FolderKanban className="size-4 text-primary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">{projects.length}</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sprint Progress
                    </span>
                    <Zap className="size-4 text-emerald-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">On Track</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Risks
                    </span>
                    <AlertTriangle className="size-4 text-amber-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">0 Blockers</div>
                </div>
              </div>
            )}

            {/* 4. DEVELOPER WIDGETS */}
            {isDeveloper && !isOwner && !isAdmin && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Assigned Workspace Projects
                    </span>
                    <FolderKanban className="size-4 text-primary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">{projects.length}</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Sprint Work
                    </span>
                    <CheckSquare className="size-4 text-secondary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">Active</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Code Review Requests
                    </span>
                    <GitPullRequest className="size-4 text-purple-500" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">0 Pending</div>
                </div>
              </div>
            )}

            {/* 5. VIEWER WIDGETS */}
            {isViewer && !isOwner && !isAdmin && !isPM && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Read-Only Projects
                    </span>
                    <Eye className="size-4 text-primary" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">{projects.length}</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Access Level
                    </span>
                    <ShieldCheck className="size-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-foreground">Viewer</div>
                </div>
              </div>
            )}

            {/* Projects Overview Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Projects Overview</h3>
                <Link href="/projects" className="text-xs font-semibold text-primary hover:underline">
                  View All Projects
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {isOwner || isAdmin || isPM
                    ? "No projects created yet. Click 'New Project' to get started."
                    : "No projects assigned to your workspace yet."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between hover:border-primary/50 transition-all dark:bg-card"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-base font-bold text-foreground line-clamp-1">
                            {project.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {project.status}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/projects/${project.id}/board`}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/95"
                        >
                          Open Board <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedShell>
  );
}
