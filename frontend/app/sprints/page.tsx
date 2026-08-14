"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import { Zap, ArrowRight, FolderKanban, Loader2, AlertCircle } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function SprintsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/projects");
      setProjects(res.data.data.projects || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load sprint projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <ProtectedShell pageTitle="Sprints">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Sprints & Milestones</h2>
            <p className="text-sm text-muted-foreground">
              Select a project to view and manage its active sprint board, deliverables, and Kanban workflow.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Zap className="size-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-base font-bold text-foreground">No active sprint streams</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Create a project first to start planning sprint cycles and managing Kanban tasks.
            </p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95"
              >
                Go to Projects
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between hover:border-primary/50 transition-all dark:bg-card"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="size-4 text-primary" />
                      <h4 className="text-base font-bold text-foreground line-clamp-1">
                        {project.name}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
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
                  <span className="text-xs text-muted-foreground">Active Sprint</span>
                  <Link
                    href={`/projects/${project.id}/board`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/95 transition-colors"
                  >
                    <Zap className="size-3" /> Open Sprint Board <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
