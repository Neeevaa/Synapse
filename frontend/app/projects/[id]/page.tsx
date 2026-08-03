"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  User as UserIcon,
  FolderKanban,
  Zap,
  CheckSquare,
  Users,
  Settings,
  Plus,
  Trash2,
  Save,
  Kanban,
  X,
  UserCheck,
} from "lucide-react";

/* ─── Zod Schemas ─── */
const editProjectSchema = z.object({
  name: z.string().min(1, "Project name is required.").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.string(),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

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

/* ─── Interfaces ─── */
interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  creator_name: string | null;
  created_at: string;
  sprint_count: number;
  task_count: number;
  member_count: number;
}

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "members" | "settings">("overview");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit / Settings state
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Member Modal State
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("BACKEND_DEVELOPER");
  const [memberNotice, setMemberNotice] = useState<{ message: string; type: "success" | "pending" } | null>(null);

  const canManage = userRole === "OWNER" || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  const fetchProjectDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Project not found or access denied."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/members`);
      setMembers(res.data.data.members);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  }, [projectId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserRole(res.data.data.role);
        setCurrentUserId(res.data.data.id);
      } catch {
        // Handled by ProtectedShell
      }
    };

    if (projectId) {
      fetchUser();
      fetchProjectDetail();
      fetchMembers();
    }
  }, [projectId, fetchProjectDetail, fetchMembers]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: editErrors },
  } = useForm<EditProjectFormValues>({
    resolver: customResolver(editProjectSchema) as any,
  });

  useEffect(() => {
    if (project) {
      setValue("name", project.name);
      setValue("description", project.description || "");
      setValue("status", project.status);
    }
  }, [project, setValue]);

  const onUpdateSubmit = async (data: EditProjectFormValues) => {
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    try {
      const res = await api.put(`/projects/${projectId}`, data);
      setProject(res.data.data);
      setUpdateSuccess(true);
    } catch (err: any) {
      setUpdateError(
        err.response?.data?.message || "Failed to update project settings."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}`);
      router.push("/projects");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete project.");
      setDeleting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setAddMemberError("Email address is required.");
      return;
    }
    setAddingMember(true);
    setAddMemberError(null);
    setMemberNotice(null);
    try {
      const res = await api.post(`/projects/${projectId}/members`, {
        email: memberEmail.trim(),
        role: memberRole,
      });

      const data = res.data.data;
      const targetEmail = memberEmail.trim();
      setAddMemberOpen(false);
      setMemberEmail("");

      if (data?.outcome === "pending" || data?.is_pending) {
        setMemberNotice({
          message: `Invitation sent — ${targetEmail} will be added automatically once they register.`,
          type: "pending",
        });
      } else {
        setMemberNotice({
          message: `Member ${targetEmail} added to project successfully.`,
          type: "success",
        });
      }

      setTimeout(() => setMemberNotice(null), 6000);
      fetchMembers();
      fetchProjectDetail();
    } catch (err: any) {
      setAddMemberError(
        err.response?.data?.message || "Failed to add member to project."
      );
    } finally {
      setAddingMember(false);
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
    <ProtectedShell pageTitle={project?.name || "Project Details"}>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Projects
        </Link>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error Boundary / Project Not Found */}
        {error && !loading && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg mx-auto dark:bg-destructive/20">
            <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Project Not Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Return to Projects List
              </Link>
            </div>
          </div>
        )}

        {/* Project Content */}
        {project && !loading && (
          <div className="space-y-6">
            {/* Project Banner Header */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-2xs dark:bg-card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FolderKanban className="size-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {project.creator_name && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="size-3.5" /> Created by {project.creator_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" /> {formatDate(project.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/projects/${project.id}/board`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/95 cursor-pointer"
                >
                  <Kanban className="size-4" /> Open Sprint Board
                </Link>
              </div>

              {/* Sub-nav Tabs */}
              <div className="mt-6 flex border-b border-border gap-6">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === "overview"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === "members"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Members ({members.length})
                </button>
                {canManage && (
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                      activeTab === "settings"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Settings
                  </button>
                )}
              </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Sprints
                      </span>
                      <Zap className="size-4 text-primary" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-foreground">{project.sprint_count}</div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total Tasks
                      </span>
                      <CheckSquare className="size-4 text-secondary" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-foreground">{project.task_count}</div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 shadow-2xs dark:bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Project Members
                      </span>
                      <Users className="size-4 text-primary" />
                    </div>
                    <div className="mt-3 text-2xl font-bold text-foreground">{members.length || project.member_count}</div>
                  </div>
                </div>

                {/* Description Card */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-2xs dark:bg-card">
                  <h3 className="text-base font-bold text-foreground mb-2">Project Description</h3>
                  {project.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/60 italic">
                      No description added for this project yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS */}
            {activeTab === "members" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Project Team Members</h3>
                  {canManage && (
                    <button
                      onClick={() => setAddMemberOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/95 cursor-pointer"
                    >
                      <Plus className="size-4" /> Add Team Member
                    </button>
                  )}
                </div>

                {memberNotice && (
                  <div
                    className={`flex items-center gap-2.5 rounded-lg p-4 text-sm font-medium ${
                      memberNotice.type === "pending"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                    }`}
                  >
                    <UserCheck className="size-5 shrink-0" />
                    <span>{memberNotice.message}</span>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden dark:bg-card">
                  {members.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No members assigned to this project yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {members.map((m) => (
                        <div key={m.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {m.first_name?.[0]}
                              {m.last_name?.[0]}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                {m.first_name} {m.last_name}
                                {(m as any).is_pending && (
                                  <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    Pending Invite
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{m.email}</div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-muted text-xs font-semibold uppercase tracking-wider text-foreground">
                            {m.role.replace(/_/g, " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS */}
            {activeTab === "settings" && canManage && (
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6 shadow-2xs dark:bg-card">
                  <h3 className="text-base font-bold text-foreground mb-4">Edit Project Settings</h3>

                  {updateSuccess && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="size-4" />
                      <span>Project settings saved successfully.</span>
                    </div>
                  )}

                  {updateError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
                      <AlertCircle className="size-4" />
                      <span>{updateError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Project Name</label>
                      <input
                        type="text"
                        {...register("name")}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                      />
                      {editErrors.name && (
                        <p className="mt-1 text-xs text-destructive">{editErrors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                      <textarea
                        {...register("description")}
                        rows={4}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                      <select
                        {...register("status")}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={updating}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                    >
                      {updating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save Changes
                    </button>
                  </form>
                </div>

                {/* Danger Zone */}
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 dark:bg-destructive/10">
                  <h3 className="text-base font-bold text-destructive mb-1">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Deleting this project removes all related tasks, sprint histories, and project member assignments permanently.
                  </p>
                  <button
                    onClick={handleDeleteProject}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Delete Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6 shadow-xl dark:bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Add Team Member</h3>
              <button
                onClick={() => setAddMemberOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {addMemberError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{addMemberError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                />
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  If the user has not registered yet, an invitation will be held pending until they create their account.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Project Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                >
                  <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                  <option value="TEAM_LEAD">TEAM_LEAD</option>
                  <option value="BACKEND_DEVELOPER">BACKEND_DEVELOPER</option>
                  <option value="FRONTEND_DEVELOPER">FRONTEND_DEVELOPER</option>
                  <option value="AI_ENGINEER">AI_ENGINEER</option>
                  <option value="UI_UX_DESIGNER">UI_UX_DESIGNER</option>
                  <option value="QA_ENGINEER">QA_ENGINEER</option>
                  <option value="DEVOPS_ENGINEER">DEVOPS_ENGINEER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/95 disabled:opacity-50"
                >
                  {addingMember && <Loader2 className="size-4 animate-spin" />}
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedShell>
  );
}
