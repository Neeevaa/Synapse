"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  FolderKanban,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";

/* ─── Zod Schema ─── */
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required.").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

const customResolver = (schema: z.ZodSchema) => async (data: any) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const issues = result.error.issues || (result.error as any).errors || [];
  const errors = issues.reduce((acc: any, err: any) => {
    const path = err.path.join(".") || "form";
    acc[path] = { message: err.message, type: "validation" };
    return acc;
  }, {});
  return { values: {}, errors };
};

/* ─── Types ─── */
interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  creator_name: string | null;
  created_at: string;
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    COMPLETED:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    ARCHIVED:
      "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[0.7rem] font-semibold uppercase tracking-wider ${
        colors[status] || colors.ACTIVE
      }`}
    >
      {status}
    </span>
  );
}

/* ─── Main Page ─── */
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canCreate = userRole === "OWNER" || userRole === "ADMIN";

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/projects");
      setProjects(res.data.data.projects);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load projects."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get user role from /auth/me
    const fetchRole = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserRole(res.data.data.role);
      } catch {
        // ProtectedShell handles auth redirect
      }
    };
    fetchRole();
    fetchProjects();
  }, [fetchProjects]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProjectFormValues>({
    resolver: customResolver(createProjectSchema) as any,
  });

  const onCreateSubmit = async (data: CreateProjectFormValues) => {
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/projects", {
        name: data.name,
        description: data.description || null,
      });
      setModalOpen(false);
      reset();
      fetchProjects();
    } catch (err: any) {
      setCreateError(
        err.response?.data?.message || "Failed to create project."
      );
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ProtectedShell pageTitle="Projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Projects Workspace
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your company projects and collaborate with AI agents.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer shadow-sm"
            >
              <Plus className="size-4" /> New Project
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 shadow-2xs animate-pulse"
              >
                <div className="h-5 w-2/3 rounded bg-muted mb-3" />
                <div className="h-3 w-full rounded bg-muted mb-2" />
                <div className="h-3 w-4/5 rounded bg-muted" />
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <FolderKanban className="size-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-base font-bold text-foreground">
              No projects created yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              {canCreate
                ? 'Click "New Project" above to create your first project stream.'
                : "Your organization has no projects yet. Contact your administrator to get started."}
            </p>
          </div>
        )}

        {/* Project Cards Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group rounded-xl border border-border bg-card p-5 shadow-2xs text-left transition-all hover:shadow-md hover:border-primary/30 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <StatusBadge status={project.status} />
                </div>

                {project.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
                {!project.description && (
                  <p className="mt-2 text-sm text-muted-foreground/60 italic">
                    No description provided
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  {project.creator_name && (
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {project.creator_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(project.created_at)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View project <ArrowRight className="size-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Create Project Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-foreground">
                  Create New Project
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Initialize a new workspace project for your development team.
                </p>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  reset();
                  setCreateError(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {createError && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs font-semibold text-destructive">
                <AlertCircle className="size-5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="project_name" className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="project_name"
                  type="text"
                  autoComplete="off"
                  {...register("name")}
                  placeholder="e.g. Synapse Mobile App"
                  suppressHydrationWarning
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="project_description" className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Project Description (Optional)
                </label>
                <textarea
                  id="project_description"
                  autoComplete="off"
                  {...register("description")}
                  rows={4}
                  placeholder="Provide high-level context, goals, and target deliverables for this project..."
                  className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                {errors.description && (
                  <p className="text-xs font-semibold text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    reset();
                    setCreateError(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedShell>
  );
}
