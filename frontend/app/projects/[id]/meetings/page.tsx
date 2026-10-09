"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Search,
  Video,
  Calendar,
  Clock,
  User as UserIcon,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  X,
  Layers,
  ChevronRight,
  Trash2,
  FileText,
} from "lucide-react";

interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  attendance_status: string;
}

interface AgendaItem {
  id?: string;
  title: string;
  description?: string;
  order_index?: number;
  status?: string;
}

interface MeetingItem {
  id: string;
  project_id: string;
  company_id: string;
  title: string;
  description?: string | null;
  meeting_type: string;
  organizer_id: string;
  organizer_name?: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  participants: Participant[];
  agenda_items: AgendaItem[];
}

interface ProjectMemberItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  specialization?: string | null;
}

function formatMemberRole(mem: { role: string; specialization?: string | null }): string {
  if (mem.specialization) {
    const specMap: Record<string, string> = {
      UI_UX: "UI/UX Designer",
      FRONTEND: "Frontend Developer",
      BACKEND: "Backend Developer",
      AI_ML: "AI/ML Engineer",
      QA: "QA / Testing",
      DEVOPS: "DevOps Engineer",
      FULLSTACK: "Fullstack Developer",
      OTHER: "Developer",
    };
    return specMap[mem.specialization] || mem.specialization;
  }
  if (mem.role === "PROJECT_MANAGER") return "Project Manager";
  if (mem.role === "TEAM_LEAD") return "Team Lead";
  if (mem.role === "DEVELOPER") return "Developer";
  if (mem.role === "VIEWER") return "Viewer";
  return mem.role || "Member";
}

export default function MeetingsListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [meetingType, setMeetingType] = useState<string>("PLANNING");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [organizerId, setOrganizerId] = useState<string>("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<{ title: string; description: string }[]>([
    { title: "Backlog Review", description: "Review top P0 requirements and tasks" },
  ]);

  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchProjectData = useCallback(async () => {
    try {
      const [projRes, memRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/members`),
      ]);
      setProject(projRes.data.data);
      const membersList = memRes.data.data.members || memRes.data.data || [];
      const formatted = membersList.map((m: any) => ({
        id: m.id,
        user_id: m.user_id || m.user?.id,
        user_name: m.user_name || `${m.user?.first_name || ""} ${m.user?.last_name || ""}`.trim() || m.user?.email || "Member",
        user_email: m.user_email || m.user?.email || "",
        role: m.role,
        specialization: m.specialization,
      }));
      setProjectMembers(formatted);
    } catch {}
  }, [projectId]);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter !== "ALL") queryParams.append("meeting_type", typeFilter);
      if (statusFilter !== "ALL") queryParams.append("status", statusFilter);
      if (searchKeyword.trim()) queryParams.append("keyword", searchKeyword.trim());
      queryParams.append("page", page.toString());
      queryParams.append("page_size", "20");

      const res = await api.get(`/projects/${projectId}/meetings?${queryParams.toString()}`);
      setMeetings(res.data.data.meetings || []);
      setTotalCount(res.data.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load project meetings.");
    } finally {
      setLoading(false);
    }
  }, [projectId, typeFilter, statusFilter, searchKeyword, page]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setCurrentUserId(res.data.data.id);
        setOrganizerId(res.data.data.id);
      } catch {}
    };
    fetchUser();
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleOpenScheduleModal = () => {
    // Set default scheduled_at to tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledAt(tomorrow.toISOString().slice(0, 16));
    if (projectMembers.length > 0 && !organizerId) {
      setOrganizerId(currentUserId || projectMembers[0].user_id);
    }
    setScheduleModalOpen(true);
  };

  const handleAddAgendaRow = () => {
    setAgendaItems([...agendaItems, { title: "", description: "" }]);
  };

  const handleRemoveAgendaRow = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const handleToggleParticipant = (userId: string) => {
    if (selectedParticipantIds.includes(userId)) {
      setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== userId));
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, userId]);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      setScheduleError("Title and Scheduled Date & Time are required.");
      return;
    }

    setScheduling(true);
    setScheduleError(null);
    try {
      const validAgenda = agendaItems
        .filter((ag) => ag.title.trim())
        .map((ag, idx) => ({ title: ag.title.trim(), description: ag.description.trim() || undefined, order_index: idx }));

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        meeting_type: meetingType,
        organizer_id: (organizerId && organizerId.trim()) ? organizerId.trim() : ((currentUserId && currentUserId.trim()) ? currentUserId.trim() : undefined),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        duration_minutes: Number(durationMinutes) || 60,
        participant_ids: selectedParticipantIds.filter((id) => id && id.trim() !== ""),
        agenda_items: validAgenda,
      };

      await api.post(`/projects/${projectId}/meetings`, payload);

      setScheduleModalOpen(false);
      setTitle("");
      setDescription("");
      setSelectedParticipantIds([]);
      setAgendaItems([{ title: "Backlog Review", description: "Review top P0 requirements and tasks" }]);
      fetchMeetings();
      setNotice({ message: "Meeting scheduled successfully.", type: "success" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setScheduleError(err.response?.data?.message || "Failed to schedule meeting.");
    } finally {
      setScheduling(false);
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "PLANNING":
      case "TECHNICAL":
        return "bg-secondary/15 text-secondary border-secondary/25";
      case "STANDUP":
        return "bg-primary/15 text-primary border-primary/25";
      case "REVIEW":
      case "REQUIREMENT_DISCUSSION":
        return "bg-info/15 text-info border-info/25";
      case "RETROSPECTIVE":
        return "bg-warning/15 text-warning border-warning/25";
      case "CLIENT":
        return "bg-accent/20 text-accent-foreground border-accent/30";
      default:
        return "bg-muted/80 text-muted-foreground border-border";
    }
  };

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case "SCHEDULED":
        return "bg-info/15 text-info border-info/25";
      case "IN_PROGRESS":
        return "bg-primary/15 text-primary border-primary/25";
      case "COMPLETED":
        return "bg-secondary/20 text-secondary border-secondary/30";
      case "CANCELLED":
        return "bg-muted/80 text-muted-foreground border-border";
      default:
        return "bg-muted/80 text-muted-foreground border-border";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <ProtectedShell>
      <div className="w-full space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Project Overview
          </Link>
          <div className="text-xs text-muted-foreground">
            {project?.name && <span className="font-semibold text-foreground">{project.name}</span>}
          </div>
        </div>

        {/* Banner Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Video className="size-6 text-cyan-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Project Meetings</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {totalCount} Total
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Structured meeting intelligence feeding AI summarization, automatic task generation, and requirement traceability
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenScheduleModal}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-cyan-500 cursor-pointer shrink-0"
          >
            <Plus className="size-4" /> Schedule Meeting
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`rounded-lg p-4 text-xs font-medium border flex items-center justify-between ${
              notice.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" /> {notice.message}
            </span>
            <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search meeting title, agenda, or notes..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Meeting Types</option>
                <option value="PLANNING">Planning</option>
                <option value="STANDUP">Standup</option>
                <option value="REVIEW">Review</option>
                <option value="RETROSPECTIVE">Retrospective</option>
                <option value="REQUIREMENT_DISCUSSION">Requirement Discussion</option>
                <option value="TECHNICAL">Technical</option>
                <option value="CLIENT">Client</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Meetings List / Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-3">
              <Loader2 className="size-8 animate-spin text-cyan-500" />
              <p className="text-xs font-medium">Loading project meetings...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 space-y-2">
              <AlertCircle className="size-8 mx-auto" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <Video className="size-10 mx-auto text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">No meetings scheduled</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No project meetings match your active filters. Click "Schedule Meeting" to create one.
              </p>
              <button
                onClick={handleOpenScheduleModal}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 cursor-pointer"
              >
                <Plus className="size-3.5" /> Schedule Meeting
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Scheduled Date</th>
                    <th className="py-3.5 px-4">Organizer</th>
                    <th className="py-3.5 px-4">Participants</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {meetings.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/projects/${projectId}/meetings/${m.id}`)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors max-w-xs md:max-w-sm lg:max-w-md xl:max-w-xl truncate" title={m.title}>
                        {m.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getTypeBadgeStyle(m.meeting_type)}`}>
                          {m.meeting_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          <span>{formatDate(m.scheduled_at)}</span>
                          <span className="text-xs text-muted-foreground font-mono">({m.duration_minutes}m)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 flex items-center justify-center text-xs font-bold">
                            {m.organizer_name ? m.organizer_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="truncate max-w-[120px]">{m.organizer_name || "Organizer"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-border">
                          <Users className="size-3 text-cyan-500" /> {m.participants ? m.participants.length : 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusBadgeStyle(m.status)}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {m.status === "IN_PROGRESS" && (
                            <Link
                              href={`/projects/${projectId}/meetings/${m.id}/room`}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer animate-pulse"
                            >
                              <Video className="size-3.5" /> Join Room
                            </Link>
                          )}
                          <Link
                            href={`/projects/${projectId}/meetings/${m.id}`}
                            className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-medium px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors cursor-pointer"
                          >
                            View Meeting <ChevronRight className="size-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SCHEDULE MEETING MODAL (Width: 700px - 800px) */}
        {scheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-card text-foreground shadow-2xl flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Video className="size-5 text-cyan-500" /> Schedule Project Meeting
                </h3>
                <button onClick={() => setScheduleModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {scheduleError && (
                  <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" /> {scheduleError}
                  </div>
                )}

                <form id="schedule-meeting-form" onSubmit={handleScheduleSubmit} className="space-y-6">
                  {/* Basic Details Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      Meeting Overview
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Meeting Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sprint 12 Planning & Backlog Refinement"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Meeting Type</label>
                        <select
                          value={meetingType}
                          onChange={(e) => setMeetingType(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="PLANNING">Planning</option>
                          <option value="STANDUP">Standup</option>
                          <option value="REVIEW">Review</option>
                          <option value="RETROSPECTIVE">Retrospective</option>
                          <option value="REQUIREMENT_DISCUSSION">Requirement Discussion</option>
                          <option value="TECHNICAL">Technical</option>
                          <option value="CLIENT">Client</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">Duration (Minutes)</label>
                        <input
                          type="number"
                          min={5}
                          max={1440}
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Description / Context</label>
                      <textarea
                        rows={2}
                        placeholder="Brief overview of meeting goals and focus areas..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Organizer & Participants Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                      Organizer & Participants
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Organizer</label>
                      <select
                        value={organizerId}
                        onChange={(e) => setOrganizerId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
                      >
                        {projectMembers.map((mem) => (
                          <option key={mem.id} value={mem.user_id}>
                            {mem.user_name} ({formatMemberRole(mem)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-2">Select Participants</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 rounded-xl border border-border bg-muted/20">
                        {projectMembers.map((mem) => {
                          const isSelected = selectedParticipantIds.includes(mem.user_id);
                          return (
                            <label
                              key={mem.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-cyan-500/10 border-cyan-500/40 text-foreground"
                                  : "bg-card border-border text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleParticipant(mem.user_id)}
                                className="accent-cyan-500 rounded"
                              />
                              <span className="truncate">{mem.user_name}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto font-mono">({formatMemberRole(mem)})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Agenda Items Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meeting Agenda</h4>
                      <button
                        type="button"
                        onClick={handleAddAgendaRow}
                        className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-semibold cursor-pointer"
                      >
                        <Plus className="size-3.5" /> Add Agenda Topic
                      </button>
                    </div>

                    <div className="space-y-2">
                      {agendaItems.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-border bg-muted/20">
                          <span className="font-mono text-xs font-bold text-cyan-500 mt-2">{idx + 1}.</span>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              placeholder={`Topic ${idx + 1} Title`}
                              value={item.title}
                              onChange={(e) => {
                                const copy = [...agendaItems];
                                copy[idx].title = e.target.value;
                                setAgendaItems(copy);
                              }}
                              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Brief description or outcome expected..."
                              value={item.description}
                              onChange={(e) => {
                                const copy = [...agendaItems];
                                copy[idx].description = e.target.value;
                                setAgendaItems(copy);
                              }}
                              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none"
                            />
                          </div>
                          {agendaItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAgendaRow(idx)}
                              className="text-muted-foreground hover:text-rose-500 p-1 mt-1 cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="rounded-lg border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="schedule-meeting-form"
                  disabled={scheduling}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors cursor-pointer"
                >
                  {scheduling && <Loader2 className="size-3.5 animate-spin" />} Schedule Meeting
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
