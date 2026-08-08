"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  X,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Flag,
  Tag,
  MessageSquare,
  Edit3,
  Check,
  Clock,
  Send,
  Trash2,
} from "lucide-react";

/* ─── Types ─── */
interface TaskDetail {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
}

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
}

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: (task: TaskDetail) => void;
  onTaskDeleted?: (taskId: string) => void;
  currentUserId?: string | null;
  userRole?: string | null;
  projectRole?: string | null;
}

/* ─── Constants ─── */
const STATUS_OPTIONS = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  IN_REVIEW: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  DONE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

/* ─── Inline Edit Field ─── */
function InlineField({
  label,
  value,
  onSave,
  multiline = false,
  icon,
  editable = true,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  multiline?: boolean;
  icon?: React.ReactNode;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === "Enter") handleSave();
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  };

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </label>
      {editing && editable ? (
        <div className="flex items-start gap-2">
          {multiline ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              className="flex-1 w-full rounded-lg border border-primary bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-lg border border-primary bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 shrink-0 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3.5" />}
          </button>
        </div>
      ) : (
        <button
          onClick={() => editable && setEditing(true)}
          disabled={!editable}
          className={`group w-full text-left rounded-lg px-3 py-2 text-sm text-foreground transition-colors border border-transparent ${
            editable ? "hover:bg-muted hover:border-border cursor-pointer" : "cursor-default opacity-90"
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className={!value ? "text-muted-foreground/60 italic" : ""}>
              {value || "No description provided."}
            </span>
            {editable && (
              <Edit3 className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </span>
        </button>
      )}
    </div>
  );
}

/* ─── Main Panel Component ─── */
export default function TaskDetailPanel({
  taskId,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  currentUserId,
  userRole,
  projectRole,
}: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Delete Task Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const isCompanyAdmin = userRole === "OWNER" || userRole === "ADMIN";
  const isPM = isCompanyAdmin || projectRole === "PROJECT_MANAGER";
  const isTeamLead = isPM || projectRole === "TEAM_LEAD";
  const canEditTaskFull = isTeamLead;
  const canDeleteTask = isTeamLead;
  const canChangeTaskStatus =
    isTeamLead ||
    (task &&
      ((task.assignee_id && currentUserId && String(task.assignee_id) === String(currentUserId)) ||
        (task.created_by && currentUserId && String(task.created_by) === String(currentUserId))));

  const fetchTaskAndComments = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [taskRes, commentsRes] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get(`/tasks/${taskId}/comments`),
      ]);
      setTask(taskRes.data.data);
      setComments(commentsRes.data.data.comments);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskAndComments();
  }, [fetchTaskAndComments]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const patchTask = async (fields: Record<string, any>) => {
    if (!task) return;
    setActionError(null);
    try {
      if (Object.keys(fields).length === 1 && fields.status) {
        const res = await api.patch(`/tasks/${task.id}/status`, { status: fields.status });
        const updated = res.data.data;
        setTask(updated);
        onTaskUpdated(updated);
      } else {
        const res = await api.put(`/tasks/${task.id}`, fields);
        const updated = res.data.data;
        setTask(updated);
        onTaskUpdated(updated);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setActionError("Permission Denied: You do not have permission to modify this task.");
      } else {
        setActionError(err.response?.data?.message || "Failed to update task.");
      }
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    setDeletingTask(true);
    setActionError(null);
    try {
      await api.delete(`/tasks/${task.id}`);
      setDeleteModalOpen(false);
      onTaskDeleted?.(task.id);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setActionError("Permission Denied: You do not have permission to delete this task.");
      } else {
        setActionError(err.response?.data?.message || "Failed to delete task.");
      }
    } finally {
      setDeletingTask(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newComment.trim()) return;

    setPostingComment(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, {
        content: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data.data]);
      setNewComment("");
    } catch (err: any) {
      if (err.response?.status === 403) {
        setActionError("Permission Denied: You do not have permission to post comments.");
      } else {
        alert(err.response?.data?.message || "Failed to post comment.");
      }
    } finally {
      setPostingComment(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isOpen = !!taskId;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[55] bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-over Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-[60] w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Task Details
          </span>
          <div className="flex items-center gap-2">
            {canDeleteTask && (
              <button
                onClick={() => setDeleteModalOpen(true)}
                title="Delete Task"
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {actionError}
            </div>
          )}

          {task && !loading && (
            <>
              {/* Title */}
              <InlineField
                label="Title"
                value={task.title}
                editable={canEditTaskFull}
                icon={<Edit3 className="size-3" />}
                onSave={(v) => patchTask({ title: v })}
              />

              {/* Status & Priority — side by side selects */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Tag className="size-3" /> Status
                  </label>
                  {canChangeTaskStatus ? (
                    <select
                      value={task.status}
                      onChange={(e) => patchTask({ status: e.target.value })}
                      className={`w-full rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                        STATUS_COLORS[task.status] || ""
                      } bg-transparent`}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block w-full px-3 py-1.5 rounded-lg text-xs font-semibold border ${STATUS_COLORS[task.status] || ""}`}>
                      {STATUS_OPTIONS.find((o) => o.value === task.status)?.label || task.status}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Flag className="size-3" /> Priority
                  </label>
                  {canEditTaskFull ? (
                    <select
                      value={task.priority}
                      onChange={(e) => patchTask({ priority: e.target.value })}
                      className={`w-full rounded-lg border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                        PRIORITY_COLORS[task.priority] || ""
                      } bg-transparent`}
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block w-full px-3 py-1.5 rounded-lg text-xs font-semibold border ${PRIORITY_COLORS[task.priority] || ""}`}>
                      {PRIORITY_OPTIONS.find((o) => o.value === task.priority)?.label || task.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <InlineField
                label="Description"
                value={task.description || ""}
                multiline
                editable={canEditTaskFull}
                icon={<Edit3 className="size-3" />}
                onSave={(v) => patchTask({ description: v || null })}
              />

              {/* Assignee */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <User className="size-3" /> Assignee
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40">
                  {task.assignee_name ? (
                    <>
                      <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {task.assignee_name[0]}
                      </div>
                      <span className="text-sm text-foreground">{task.assignee_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground/60 italic">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>Created: {formatDate(task.created_at)}</span>
                </div>
                {task.updated_at && task.updated_at !== task.created_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>Updated: {formatDate(task.updated_at)}</span>
                  </div>
                )}
              </div>

              {/* Comments & Activity Thread */}
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Comments & Activity ({comments.length})
                    </h4>
                  </div>
                </div>

                {/* Comment Thread */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground/60 italic">
                      No comments yet. Start the conversation below.
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-border bg-card p-3.5 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {c.author_name[0]}
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {c.author_name}
                            </span>
                          </div>
                          <span className="text-[0.68rem] text-muted-foreground">
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap pl-8">
                          {c.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Posting Box */}
                <form onSubmit={handlePostComment} className="pt-2 space-y-2">
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={postingComment || !newComment.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                    >
                      {postingComment ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Send className="size-3" />
                      )}
                      Post Comment
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Delete Task Confirmation Modal */}
      {deleteModalOpen && task && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6 shadow-xl dark:bg-card">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertCircle className="size-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Delete Task</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <span className="font-bold text-foreground">"{task.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deletingTask}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={deletingTask}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
              >
                {deletingTask ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
