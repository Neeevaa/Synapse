"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ProtectedShell from "@/components/ProtectedShell";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  X,
  User,
  Zap,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Trash2,
} from "lucide-react";

/* ─── Zod Schemas ─── */
const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required.").max(250),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority: z.string(),
  status: z.string(),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

const createSprintSchema = z
  .object({
    name: z.string().min(1, "Sprint name is required.").max(150),
    goal: z.string().max(1000).optional().or(z.literal("")),
    capacity: z.coerce.number().min(0, "Capacity must be non-negative.").max(1000).optional().or(z.literal("")),
    start_date: z.string().optional().or(z.literal("")),
    end_date: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) > new Date(data.start_date);
      }
      return true;
    },
    {
      message: "End date must be strictly after start date.",
      path: ["end_date"],
    }
  );

type CreateSprintFormValues = z.infer<typeof createSprintSchema>;

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
interface TaskItem {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  workstream?: string | null;
  story_points?: number | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by?: string | null;
  created_at: string;
}

interface SprintDetail {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: string;
  capacity?: number | null;
  allocated_points?: number;
  remaining_capacity?: number | null;
  start_date: string | null;
  end_date: string | null;
  total_tasks: number;
  completed_tasks: number;
}

const BOARD_COLUMNS = [
  { key: "TODO", label: "To Do", color: "border-zinc-500/30 text-zinc-600 dark:text-zinc-400" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-500/30 text-blue-600 dark:text-blue-400" },
  { key: "IN_REVIEW", label: "In Review", color: "border-purple-500/30 text-purple-600 dark:text-purple-400" },
  { key: "DONE", label: "Done", color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
  { key: "CANCELLED", label: "Cancelled", color: "border-red-500/30 text-red-600 dark:text-red-400" },
];

const WORKSTREAM_BADGES: Record<string, { label: string; style: string }> = {
  GENERAL: { label: "General", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  UI_UX: { label: "UI/UX", style: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  FRONTEND: { label: "Frontend", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  BACKEND: { label: "Backend", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  QA: { label: "QA", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  DEVOPS: { label: "DevOps", style: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  AI_ML: { label: "AI/ML", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

function WorkstreamBadge({ workstream }: { workstream?: string | null }) {
  const ws = workstream || "GENERAL";
  const badge = WORKSTREAM_BADGES[ws] || WORKSTREAM_BADGES.GENERAL;
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-bold uppercase tracking-wider ${badge.style}`}>
      {badge.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-bold",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-bold uppercase tracking-wider ${colors[priority] || colors.MEDIUM}`}>
      {priority}
    </span>
  );
}

export default function SprintBoardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [sprint, setSprint] = useState<SprintDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User & Permission State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<string | null>(null);

  // Card Delete Task Confirmation Modal
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deletingCardTask, setDeletingCardTask] = useState(false);

  // Toast Error for Optimistic UI Rollback
  const [toastError, setToastError] = useState<string | null>(null);

  // Task Detail Slide-Over
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Create Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  // Create Sprint Modal
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [creatingSprint, setCreatingSprint] = useState(false);
  const [createSprintError, setCreateSprintError] = useState<string | null>(null);

  // Delete Sprint Modal
  const [deleteSprintModalOpen, setDeleteSprintModalOpen] = useState(false);
  const [deletingSprint, setDeletingSprint] = useState(false);
  const [deleteSprintError, setDeleteSprintError] = useState<string | null>(null);

  const fetchBoardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sprintRes = await api.get(`/projects/${projectId}/sprints/active`);
      const activeSprint = sprintRes.data.data;
      setSprint(activeSprint);

      if (activeSprint?.id) {
        const tasksRes = await api.get(`/projects/${projectId}/tasks?sprint_id=${activeSprint.id}`);
        setTasks(tasksRes.data.data.tasks || []);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load board data.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchUserAndPermissions = useCallback(async () => {
    try {
      const [meRes, membersRes] = await Promise.all([
        api.get("/auth/me"),
        api.get(`/projects/${projectId}/members`),
      ]);
      const userId = meRes.data.data.id;
      const compRole = meRes.data.data.role;
      setCurrentUserId(userId);
      setUserRole(compRole);

      const members = membersRes.data.data.members || [];
      const currentMember = members.find((m: any) => m.user_id === userId);
      setProjectRole(currentMember?.role || null);
    } catch {
      // Handled by ProtectedShell
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchBoardData();
      fetchUserAndPermissions();
    }
  }, [projectId, fetchBoardData, fetchUserAndPermissions]);

  const isCompanyAdmin = userRole === "OWNER" || userRole === "ADMIN";
  const isPM = isCompanyAdmin || projectRole === "PROJECT_MANAGER";
  const isTeamLead = isPM || projectRole === "TEAM_LEAD";
  const canCreateSprint = isPM;
  const canCreateTask = isTeamLead;
  const canDeleteTask = isTeamLead;
  const canChangeTaskStatus = (t: TaskItem) =>
    isTeamLead ||
    (t.assignee_id && currentUserId && String(t.assignee_id) === String(currentUserId)) ||
    (t.created_by && currentUserId && String(t.created_by) === String(currentUserId));

  const {
    register: registerTask,
    handleSubmit: handleSubmitTask,
    reset: resetTask,
    formState: { errors: taskFormErrors },
  } = useForm<CreateTaskFormValues>({
    resolver: customResolver(createTaskSchema) as any,
    defaultValues: { priority: "MEDIUM", status: "TODO" },
  });

  const {
    register: registerSprint,
    handleSubmit: handleSubmitSprint,
    reset: resetSprint,
    formState: { errors: sprintFormErrors },
  } = useForm<CreateSprintFormValues>({
    resolver: customResolver(createSprintSchema) as any,
  });

  /* ─── Optimistic Status Movement ─── */
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const originalTasks = [...tasks];
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.status === newStatus) return;

    if (!canChangeTaskStatus(targetTask)) {
      setToastError("Permission Denied: You do not have permission to change status for this task.");
      setTimeout(() => setToastError(null), 5000);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
    } catch (err: any) {
      setTasks(originalTasks);
      const msg =
        err.response?.status === 403
          ? "Permission Denied: You do not have permission to change status for this task."
          : err.response?.data?.message || "Failed to update task. Changes reverted.";
      setToastError(msg);
      setTimeout(() => setToastError(null), 5000);
    }
  };

  const handleDeleteCardTask = async () => {
    if (!taskToDelete) return;
    setDeletingCardTask(true);
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: You do not have permission to delete tasks."
          : err.response?.data?.message || "Failed to delete task.";
      setToastError(msg);
      setTimeout(() => setToastError(null), 5000);
    } finally {
      setDeletingCardTask(false);
    }
  };

  const handleTaskUpdated = (updatedTask: any) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updatedTask.id
          ? {
              ...t,
              title: updatedTask.title,
              description: updatedTask.description,
              status: updatedTask.status,
              priority: updatedTask.priority,
              assignee_id: updatedTask.assignee_id,
              assignee_name: updatedTask.assignee_name,
            }
          : t
      )
    );
  };

  const handleTaskDeleted = (deletedTaskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
  };

  const onCreateTaskSubmit = async (data: CreateTaskFormValues) => {
    setCreatingTask(true);
    setCreateTaskError(null);
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title: data.title.trim(),
        description: data.description || null,
        priority: data.priority,
        status: data.status,
        sprint_id: sprint?.id || null,
      });
      setTaskModalOpen(false);
      resetTask();
      fetchBoardData();
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: Only Team Leads, PMs, or Admins can create tasks."
          : err.response?.data?.message || "Failed to create task.";
      setCreateTaskError(msg);
    } finally {
      setCreatingTask(false);
    }
  };

  const onCreateSprintSubmit = async (data: CreateSprintFormValues) => {
    setCreatingSprint(true);
    setCreateSprintError(null);
    try {
      const cap = data.capacity !== "" && data.capacity !== undefined ? Number(data.capacity) : null;
      await api.post(`/projects/${projectId}/sprints`, {
        name: data.name.trim(),
        goal: data.goal || null,
        capacity: cap,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
      });
      setSprintModalOpen(false);
      resetSprint();
      fetchBoardData();
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: Only PMs or Admins can create sprints."
          : err.response?.data?.message || "Failed to create sprint.";
      setCreateSprintError(msg);
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleDeleteActiveSprint = async () => {
    if (!sprint) return;
    setDeletingSprint(true);
    setDeleteSprintError(null);
    try {
      await api.delete(`/sprints/${sprint.id}`);
      setDeleteSprintModalOpen(false);
      fetchBoardData();
    } catch (err: any) {
      setDeleteSprintError(err.response?.data?.message || "Failed to delete sprint.");
    } finally {
      setDeletingSprint(false);
    }
  };

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <ProtectedShell pageTitle="Sprint Board">
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Project Overview
        </Link>

        {/* Optimistic Rollback Toast */}
        {toastError && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-destructive p-4 text-sm font-medium text-destructive-foreground shadow-2xl">
            <AlertTriangle className="size-5 shrink-0" />
            <span>{toastError}</span>
          </div>
        )}

        {/* Sprint Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs dark:bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {sprint?.name || "Active Sprint"}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {sprint?.status || "ACTIVE"}
                </span>
                {sprint && canCreateSprint && (
                  <button
                    type="button"
                    onClick={() => setDeleteSprintModalOpen(true)}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer ml-1"
                    title="Delete Active Sprint"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sprint?.goal || "Manage tasks across Kanban columns. Click any card to view details."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canCreateSprint && (
                <button
                  onClick={() => setSprintModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  <Calendar className="size-4 text-primary" /> New Sprint
                </button>
              )}

              {canCreateTask && (
                <button
                  onClick={() => setTaskModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/95 cursor-pointer"
                >
                  <Plus className="size-4" /> Add Task
                </button>
              )}
            </div>
          </div>

          {/* Progress & Capacity Bars */}
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Sprint Task Completion</span>
                <span>{doneCount} / {totalCount} tasks done ({progressPercent}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Story Points Capacity Meter */}
            {sprint && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground flex-wrap gap-1">
                  <span className="flex items-center gap-1.5">
                    Story Points Capacity
                    {sprint.capacity !== null && sprint.capacity !== undefined && (sprint.allocated_points ?? 0) > sprint.capacity && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center gap-1">
                        <AlertTriangle className="size-3 shrink-0" /> Over Capacity (+{(sprint.allocated_points ?? 0) - sprint.capacity} pts)
                      </span>
                    )}
                  </span>
                  <span>
                    {sprint.capacity !== null && sprint.capacity !== undefined
                      ? `${sprint.allocated_points ?? 0} / ${sprint.capacity} points`
                      : `${sprint.allocated_points ?? 0} points allocated (Uncapped)`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      sprint.capacity !== null && sprint.capacity !== undefined && (sprint.allocated_points ?? 0) > sprint.capacity
                        ? "bg-destructive"
                        : "bg-primary"
                    }`}
                    style={{
                      width: sprint.capacity
                        ? `${Math.min(100, Math.round(((sprint.allocated_points ?? 0) / sprint.capacity) * 100))}%`
                        : "100%",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Kanban Board */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {BOARD_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div
                  key={col.key}
                  className="rounded-xl border border-border bg-card/60 p-4 flex flex-col min-h-[500px] shadow-2xs dark:bg-card/40"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="size-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="h-24 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground/60 italic">
                        No tasks
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="group rounded-lg border border-border bg-card p-4 shadow-2xs space-y-3 transition-all hover:border-primary/50 hover:shadow-sm dark:bg-card cursor-pointer relative"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors pr-4">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                              <WorkstreamBadge workstream={task.workstream} />
                              <PriorityBadge priority={task.priority} />
                              {canDeleteTask && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskToDelete(task);
                                  }}
                                  title="Delete Task"
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                              <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div
                            className="flex items-center justify-between pt-2 border-t border-border text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <User className="size-3" />
                              {task.assignee_name || "Unassigned"}
                            </span>

                            {canChangeTaskStatus(task) ? (
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className="text-[0.7rem] bg-muted text-foreground border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="DONE">Done</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                            ) : (
                              <span className="text-[0.68rem] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                                {BOARD_COLUMNS.find((c) => c.key === task.status)?.label || task.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Slide-Over Panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        currentUserId={currentUserId}
        userRole={userRole}
        projectRole={projectRole}
      />

      {/* Card Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6 shadow-xl dark:bg-card">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertCircle className="size-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Delete Task</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <span className="font-bold text-foreground">"{taskToDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={deletingCardTask}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCardTask}
                disabled={deletingCardTask}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {deletingCardTask ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg mx-4 rounded-xl border border-border bg-card p-6 shadow-xl dark:bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Create New Task</h3>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {createTaskError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{createTaskError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTask(onCreateTaskSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Task Title</label>
                <input
                  type="text"
                  {...registerTask("title")}
                  placeholder="e.g. Implement JWT Refresh Rotation"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {taskFormErrors.title && (
                  <p className="mt-1 text-xs text-destructive">{taskFormErrors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description (Optional)</label>
                <textarea
                  {...registerTask("description")}
                  rows={3}
                  placeholder="Task details and acceptance criteria..."
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                  <select
                    {...registerTask("priority")}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    {...registerTask("status")}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/95 disabled:opacity-50"
                >
                  {creatingTask && <Loader2 className="size-4 animate-spin" />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {sprintModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg mx-4 rounded-xl border border-border bg-card p-6 shadow-xl dark:bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Create New Sprint</h3>
              <button
                onClick={() => setSprintModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {createSprintError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{createSprintError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSprint(onCreateSprintSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sprint Name</label>
                <input
                  type="text"
                  {...registerSprint("name")}
                  placeholder="e.g. Sprint 2 - Authentication & Authorization"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {sprintFormErrors.name && (
                  <p className="mt-1 text-xs text-destructive">{sprintFormErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sprint Goal (Optional)</label>
                <textarea
                  {...registerSprint("goal")}
                  rows={3}
                  placeholder="Key objectives and deliverables for this sprint..."
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Target Capacity (Story Points)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  {...registerSprint("capacity")}
                  placeholder="e.g. 40"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {sprintFormErrors.capacity && (
                  <p className="mt-1 text-xs text-destructive">{sprintFormErrors.capacity.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                  <input
                    type="date"
                    {...registerSprint("start_date")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                  <input
                    type="date"
                    {...registerSprint("end_date")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {sprintFormErrors.end_date && (
                    <p className="mt-1 text-xs text-destructive">{sprintFormErrors.end_date.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSprintModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSprint}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/95 disabled:opacity-50"
                >
                  {creatingSprint && <Loader2 className="size-4 animate-spin" />}
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sprint Modal */}
      {deleteSprintModalOpen && sprint && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 shadow-xl space-y-4 dark:bg-card">
            <div className="flex items-center gap-3 text-destructive">
              <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Sprint Confirmation</h3>
                <p className="text-xs text-muted-foreground">Permanent action</p>
              </div>
            </div>

            {deleteSprintError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteSprintError}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete sprint <strong className="text-foreground font-bold">"{sprint.name}"</strong>? This will remove the sprint container and detach any associated tasks back to the backlog.
            </p>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteSprintModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingSprint}
                onClick={handleDeleteActiveSprint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 shadow-xs"
              >
                {deletingSprint && <Loader2 className="size-3.5 animate-spin" />}
                Delete Sprint
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedShell>
  );
}
