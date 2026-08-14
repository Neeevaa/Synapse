"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  formatRoleLabel,
  formatSpecializationLabel,
  getRoleBadgeStyle,
  getSpecializationBadgeStyle,
  PROJECT_ROLE_OPTIONS,
  SPECIALIZATION_OPTIONS,
} from "@/lib/roleUtils";
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
  Layers,
  GitFork,
  X,
  UserCheck,
  UserMinus,
  Mail,
  Shield,
  Briefcase,
  Copy,
  Check,
  FileText,
  Video,
  Clock,
  Edit3,
  Database,
} from "lucide-react";

/* ─── Zod Schemas ─── */
const editProjectSchema = z.object({
  name: z.string().min(1, "Project name is required.").max(150),
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
  company_id: string;
  created_by: string;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  sprint_count: number;
  task_count: number;
}

interface ProjectMemberItem {
  id: string;
  project_id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  specialization?: string | null;
  is_pending?: boolean;
  created_at?: string;
}

interface TaskItem {
  id: string;
  status: string;
  assignee_id: string | null;
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

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "settings">("overview");

  // User & Permission State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Settings Form State
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [inviteSpecialization, setInviteSpecialization] = useState("FRONTEND");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteNotice, setInviteNotice] = useState<{ message: string; joinUrl?: string; type: "success" | "pending" } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Member Role Edit Modal State
  const [editRoleMember, setEditRoleMember] = useState<ProjectMemberItem | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [editRoleError, setEditRoleError] = useState<string | null>(null);
  const [newMemberRole, setNewMemberRole] = useState("DEVELOPER");
  const [newMemberSpecialization, setNewMemberSpecialization] = useState("OTHER");

  // Member Removal State
  const [memberToDelete, setMemberToDelete] = useState<ProjectMemberItem | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);

  // Revoke Invitation State
  const [invitationToRevoke, setInvitationToRevoke] = useState<ProjectMemberItem | null>(null);
  const [revokingInvitation, setRevokingInvitation] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const currentUserProjectMember = members.find((m) => m.user_id === currentUserId);
  const projectRole = currentUserProjectMember?.role;
  const canManage = userRole === "OWNER" || userRole === "ADMIN" || userRole === "PROJECT_MANAGER" || projectRole === "PROJECT_MANAGER";

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
      setMembers(res.data.data.members || []);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/tasks`);
      setTasks(res.data.data.tasks || []);
    } catch {
      // Optional background fetch for workload metrics
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
      fetchTasks();
    }
  }, [projectId, fetchProjectDetail, fetchMembers, fetchTasks]);

  // Compute Workload Map (Tasks count per user)
  const workloadMap = tasks.reduce<Record<string, { total: number; active: number; done: number }>>((acc, task) => {
    if (task.assignee_id) {
      if (!acc[task.assignee_id]) {
        acc[task.assignee_id] = { total: 0, active: 0, done: 0 };
      }
      acc[task.assignee_id].total += 1;
      if (task.status === "DONE" || task.status === "COMPLETED") {
        acc[task.assignee_id].done += 1;
      } else {
        acc[task.assignee_id].active += 1;
      }
    }
    return acc;
  }, {});

  // Separate active members vs pending invitations
  const activeMembers = members.filter((m) => !m.is_pending && m.user_id);
  const pendingInvitations = members.filter((m) => m.is_pending || !m.user_id);

  const handleRemoveMember = async () => {
    if (!memberToDelete || !memberToDelete.user_id) return;
    setRemovingMember(true);
    setRemoveMemberError(null);
    try {
      await api.delete(`/projects/${projectId}/members/${memberToDelete.user_id}`);
      setInviteNotice({
        message:
          memberToDelete.user_id === currentUserId
            ? "You have left the project."
            : `Removed ${memberToDelete.first_name || memberToDelete.email} from project.`,
        type: "success",
      });
      setTimeout(() => setInviteNotice(null), 5000);
      setMemberToDelete(null);
      fetchMembers();
      fetchProjectDetail();
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: You do not have permission to remove members."
          : err.response?.data?.message || "Failed to remove project member.";
      setRemoveMemberError(msg);
    } finally {
      setRemovingMember(false);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!invitationToRevoke) return;
    setRevokingInvitation(true);
    setRevokeError(null);
    try {
      await api.delete(`/projects/${projectId}/invitations/${invitationToRevoke.id}`);
      setInviteNotice({
        message: `Invitation for ${invitationToRevoke.email} has been revoked.`,
        type: "success",
      });
      setTimeout(() => setInviteNotice(null), 5000);
      setInvitationToRevoke(null);
      fetchMembers();
    } catch (err: any) {
      setRevokeError(err.response?.data?.message || "Failed to revoke invitation.");
    } finally {
      setRevokingInvitation(false);
    }
  };

  const handleUpdateMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleMember || !editRoleMember.user_id) return;
    setUpdatingRole(true);
    setEditRoleError(null);

    try {
      const payload: { role: string; specialization?: string } = {
        role: newMemberRole,
      };
      if (newMemberRole === "DEVELOPER") {
        payload.specialization = newMemberSpecialization || "OTHER";
      } else if (newMemberSpecialization) {
        payload.specialization = newMemberSpecialization;
      }

      await api.put(`/projects/${projectId}/members/${editRoleMember.user_id}`, payload);
      setInviteNotice({
        message: `Updated project role for ${editRoleMember.first_name || editRoleMember.email}.`,
        type: "success",
      });
      setTimeout(() => setInviteNotice(null), 5000);
      setEditRoleMember(null);
      fetchMembers();
    } catch (err: any) {
      setEditRoleError(err.response?.data?.message || "Failed to update member role.");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email address is required.");
      return;
    }
    setInvitingMember(true);
    setInviteError(null);
    setInviteNotice(null);

    try {
      const payload: {
        email: string;
        project_role: string;
        specialization?: string;
        personal_message?: string;
      } = {
        email: inviteEmail.trim(),
        project_role: inviteRole,
        personal_message: inviteMessage.trim() || undefined,
      };

      if (inviteRole === "DEVELOPER") {
        payload.specialization = inviteSpecialization || "OTHER";
      } else if (inviteSpecialization) {
        payload.specialization = inviteSpecialization;
      }

      let res;
      try {
        res = await api.post(`/projects/${projectId}/members/invite`, payload);
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Fallback to legacy endpoint if route differs
          res = await api.post(`/projects/${projectId}/members`, {
            email: inviteEmail.trim(),
            role: inviteRole,
            specialization: payload.specialization,
          });
        } else {
          throw err;
        }
      }

      const data = res.data.data;
      const targetEmail = inviteEmail.trim();
      const joinUrl = data?.join_url;

      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("DEVELOPER");
      setInviteSpecialization("FRONTEND");
      setInviteMessage("");

      setInviteNotice({
        message: joinUrl
          ? `Secure invitation sent to ${targetEmail}. Shareable join link generated.`
          : `Invitation sent to ${targetEmail}.`,
        joinUrl: joinUrl,
        type: "pending",
      });

      fetchMembers();
      fetchProjectDetail();
    } catch (err: any) {
      setInviteError(
        err.response?.data?.message || "Failed to send invitation."
      );
    } finally {
      setInvitingMember(false);
    }
  };

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

  const formatDate = (iso?: string) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <ProtectedShell pageTitle={project?.name || "Project Details"}>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="mt-2 text-xs text-muted-foreground">{error}</p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/projects/${project.id}/traceability`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    <GitFork className="size-4 text-amber-500" /> Traceability Matrix
                  </Link>
                  <Link
                    href={`/projects/${project.id}/knowledge`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    <Database className="size-4 text-purple-400" /> Knowledge Base
                  </Link>
                  <Link
                    href={`/projects/${project.id}/meetings`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    <Video className="size-4 text-cyan-400" /> Meetings
                  </Link>
                  <Link
                    href={`/projects/${project.id}/requirements`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    <FileText className="size-4 text-emerald-400" /> Requirements
                  </Link>
                  <Link
                    href={`/projects/${project.id}/backlog`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted cursor-pointer"
                  >
                    <Layers className="size-4 text-primary" /> Backlog
                  </Link>
                  <Link
                    href={`/projects/${project.id}/board`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/95 cursor-pointer"
                  >
                    <Kanban className="size-4" /> Open Sprint Board
                  </Link>
                </div>
              </div>

              {/* Sub-nav Tabs */}
              <div className="mt-6 flex border-b border-border gap-6">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === "overview"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
                    activeTab === "members"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Team & Members ({members.length})
                </button>
                {canManage && (
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
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
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      No description added for this project yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS & TEAM MANAGEMENT */}
            {activeTab === "members" && (
              <div className="space-y-6">
                {/* Team Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Project Team & Members</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage development roles, technical specializations, workload, and invitations.
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => {
                        setInviteError(null);
                        setInviteModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/95 cursor-pointer shrink-0"
                    >
                      <Plus className="size-4" /> Invite Team Member
                    </button>
                  )}
                </div>

                {/* Notice Alert Banner */}
                {inviteNotice && (
                  <div
                    className={`rounded-xl p-4 text-xs font-medium border ${
                      inviteNotice.type === "pending"
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300"
                        : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="size-4 shrink-0" />
                        <span>{inviteNotice.message}</span>
                      </div>
                      {inviteNotice.joinUrl && (
                        <button
                          onClick={() => handleCopyLink(inviteNotice.joinUrl!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border border-border text-foreground hover:bg-muted font-mono text-[0.7rem] cursor-pointer"
                        >
                          {copiedLink ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          {copiedLink ? "Copied Link!" : "Copy Join Link"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Active Project Members Section */}
                <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden dark:bg-card">
                  <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Active Members ({activeMembers.length})
                      </span>
                    </div>
                  </div>

                  {activeMembers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No active members assigned to this project yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activeMembers.map((m) => {
                        const workload = m.user_id ? workloadMap[m.user_id] : null;
                        const isSelf = m.user_id === currentUserId;

                        return (
                          <div key={m.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                                {m.first_name?.[0] || m.email[0]}
                                {m.last_name?.[0] || ""}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                  {m.first_name ? `${m.first_name} ${m.last_name || ""}` : m.email}
                                  {isSelf && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                  <span>{m.email}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap justify-end">
                              {/* Workload Summary Badge */}
                              <div className="px-2.5 py-1 rounded-md text-[0.7rem] font-semibold bg-muted border border-border text-muted-foreground flex items-center gap-1.5">
                                <Briefcase className="size-3 text-primary" />
                                {workload ? (
                                  <span>
                                    {workload.total} task{workload.total !== 1 ? "s" : ""} ({workload.active} active)
                                  </span>
                                ) : (
                                  <span>0 tasks assigned</span>
                                )}
                              </div>

                              {/* Role Badge */}
                              <span className={`px-2.5 py-1 rounded-md text-[0.7rem] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(m.role)}`}>
                                {formatRoleLabel(m.role)}
                              </span>

                              {/* Specialization Badge */}
                              {m.specialization && (
                                <span className={`px-2.5 py-1 rounded-md text-[0.7rem] font-semibold tracking-wider border ${getSpecializationBadgeStyle(m.specialization)}`}>
                                  {formatSpecializationLabel(m.specialization)}
                                </span>
                              )}

                              {/* PM Actions */}
                              {canManage && (
                                <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditRoleError(null);
                                      setNewMemberRole(m.role || "DEVELOPER");
                                      setNewMemberSpecialization(m.specialization || "FRONTEND");
                                      setEditRoleMember(m);
                                    }}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                    title="Edit Role & Specialization"
                                  >
                                    <Edit3 className="size-3.5" />
                                  </button>

                                  {(canManage || isSelf) && (
                                    <button
                                      type="button"
                                      onClick={() => setMemberToDelete(m)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                      title={isSelf ? "Leave Project" : "Remove Member"}
                                    >
                                      <UserMinus className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pending Invitations Section */}
                <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden dark:bg-card">
                  <div className="p-4 border-b border-border bg-amber-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Pending Invitations ({pendingInvitations.length})
                      </span>
                    </div>
                  </div>

                  {pendingInvitations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No pending invitations for this project.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {pendingInvitations.map((inv) => (
                        <div key={inv.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-xs uppercase shrink-0">
                              <Mail className="size-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                {inv.email}
                                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  Pending Registration
                                </span>
                              </div>
                              {inv.created_at && (
                                <div className="text-[0.7rem] text-muted-foreground mt-0.5">
                                  Invited on {formatDate(inv.created_at)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 justify-end">
                            <span className={`px-2.5 py-1 rounded-md text-[0.7rem] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(inv.role)}`}>
                              {formatRoleLabel(inv.role)}
                            </span>

                            {inv.specialization && (
                              <span className={`px-2.5 py-1 rounded-md text-[0.7rem] font-semibold tracking-wider border ${getSpecializationBadgeStyle(inv.specialization)}`}>
                                {formatSpecializationLabel(inv.specialization)}
                              </span>
                            )}

                            {canManage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRevokeError(null);
                                  setInvitationToRevoke(inv);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors cursor-pointer ml-2"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
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
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="size-4" />
                      <span>Project settings saved successfully.</span>
                    </div>
                  )}

                  {updateError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive dark:bg-destructive/20">
                      <AlertCircle className="size-4" />
                      <span>{updateError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Project Name</label>
                      <input
                        type="text"
                        {...register("name")}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                      />
                      {editErrors.name && (
                        <p className="mt-1 text-xs text-destructive">{editErrors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
                      <textarea
                        {...register("description")}
                        rows={4}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                      <select
                        {...register("status")}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={updating}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                    >
                      {updating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save Changes
                    </button>
                  </form>
                </div>

                {/* Danger Zone */}
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 dark:bg-destructive/10">
                  <h3 className="text-base font-bold text-destructive mb-1">Danger Zone</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Deleting this project removes all related tasks, sprint histories, and project member assignments permanently.
                  </p>
                  <button
                    onClick={handleDeleteProject}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
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

      {/* ─── INVITE MEMBER MODAL WITH LIVE PREVIEW ─── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Mail className="size-5 text-primary" /> Invite Team Member
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a secure email invitation to join this project workspace.
                </p>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {inviteError && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs font-semibold text-destructive">
                <AlertCircle className="size-5 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvitation} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">Email Address <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">Project Role <span className="text-destructive">*</span></label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {PROJECT_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {inviteRole === "DEVELOPER" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">Specialization <span className="text-destructive">*</span></label>
                    <select
                      value={inviteSpecialization}
                      onChange={(e) => setInviteSpecialization(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {SPECIALIZATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">Personal Message (Optional)</label>
                <textarea
                  rows={3}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Join our project engineering workspace on Synapse..."
                  className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* ─── LIVE INVITATION PREVIEW ─── */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
                  <span>Invitation Email Preview</span>
                  <Shield className="size-4" />
                </div>

                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-muted-foreground font-semibold">To: </span>
                    <span className="text-foreground font-mono font-bold">{inviteEmail.trim() || "recipient@example.com"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Project: </span>
                    <span className="text-foreground font-bold">{project?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${getRoleBadgeStyle(inviteRole)}`}>
                      {formatRoleLabel(inviteRole)}
                    </span>
                    {inviteRole === "DEVELOPER" && (
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold tracking-wider border ${getSpecializationBadgeStyle(inviteSpecialization)}`}>
                        {formatSpecializationLabel(inviteSpecialization)}
                      </span>
                    )}
                  </div>
                  {inviteMessage.trim() && (
                    <div className="mt-2 text-xs text-muted-foreground italic bg-card/80 p-3 rounded-lg border border-border/50">
                      &quot;{inviteMessage.trim()}&quot;
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-foreground rounded-xl border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitingMember}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/95 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {invitingMember && <Loader2 className="size-4 animate-spin" />}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT MEMBER ROLE MODAL ─── */}
      {editRoleMember && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl dark:bg-card">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Member Role</h3>
              <button
                onClick={() => setEditRoleMember(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {editRoleError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{editRoleError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateMemberRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Member</label>
                <div className="text-xs font-bold text-foreground">
                  {editRoleMember.first_name ? `${editRoleMember.first_name} ${editRoleMember.last_name || ""}` : editRoleMember.email} ({editRoleMember.email})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Project Role *</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                >
                  {PROJECT_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {newMemberRole === "DEVELOPER" && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Specialization *</label>
                  <select
                    value={newMemberSpecialization}
                    onChange={(e) => setNewMemberSpecialization(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
                  >
                    {SPECIALIZATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRoleMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-foreground rounded-lg border border-border hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                >
                  {updatingRole && <Loader2 className="size-4 animate-spin" />}
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REVOKE INVITATION MODAL ─── */}
      {invitationToRevoke && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl dark:bg-card">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertCircle className="size-6 shrink-0" />
              <h3 className="text-base font-bold text-foreground">Revoke Invitation</h3>
            </div>

            {revokeError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{revokeError}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to revoke the pending invitation for <strong className="text-foreground">{invitationToRevoke.email}</strong>? The invitation link will immediately become invalid.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInvitationToRevoke(null)}
                disabled={revokingInvitation}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeInvitation}
                disabled={revokingInvitation}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {revokingInvitation && <Loader2 className="size-3 animate-spin" />}
                Revoke Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REMOVE MEMBER CONFIRMATION MODAL ─── */}
      {memberToDelete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl dark:bg-card">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertCircle className="size-6 shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                {memberToDelete.user_id === currentUserId ? "Leave Project" : "Remove Member"}
              </h3>
            </div>

            {removeMemberError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{removeMemberError}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              {memberToDelete.user_id === currentUserId
                ? "Are you sure you want to leave this project?"
                : `Are you sure you want to remove ${memberToDelete.first_name || memberToDelete.email} from this project?`}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMemberToDelete(null);
                  setRemoveMemberError(null);
                }}
                disabled={removingMember}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={removingMember}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {removingMember ? <Loader2 className="size-3 animate-spin" /> : <UserMinus className="size-3" />}
                {memberToDelete.user_id === currentUserId ? "Leave Project" : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedShell>
  );
}
