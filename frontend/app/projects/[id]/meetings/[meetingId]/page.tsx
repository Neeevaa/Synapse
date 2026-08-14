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
  Video,
  Calendar,
  Clock,
  User as UserIcon,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Save,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Layers,
  Link2,
  CheckSquare,
  X,
  FileCode,
  Shield,
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
  id: string;
  meeting_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  status: string;
}

interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  assignee_name?: string | null;
  due_date?: string | null;
  status: string;
  priority: string;
  requirement_id?: string | null;
  requirement_key?: string | null;
  task_id?: string | null;
  task_title?: string | null;
  created_at: string;
}

interface MeetingDetail {
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
  summary?: string | null;
  decisions?: string | null;
  discussion_notes?: string | null;
  risks_concerns?: string | null;
  transcript?: string | null;
  transcript_updated_at?: string | null;
  recording_url_or_reference?: string | null;
  created_at: string;
  participants: Participant[];
  agenda_items: AgendaItem[];
  action_items: ActionItem[];
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [projectRequirements, setProjectRequirements] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "participants" | "agenda" | "transcript" | "actions">("notes");

  // Notes Form State
  const [summary, setSummary] = useState<string>("");
  const [decisions, setDecisions] = useState<string>("");
  const [discussionNotes, setDiscussionNotes] = useState<string>("");
  const [risksConcerns, setRisksConcerns] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);

  // Transcript Form State
  const [transcript, setTranscript] = useState<string>("");
  const [recordingUrl, setRecordingUrl] = useState<string>("");
  const [savingTranscript, setSavingTranscript] = useState<boolean>(false);

  // Add Action Item Modal State
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [creatingAction, setCreatingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState<string>("");
  const [actionDesc, setActionDesc] = useState<string>("");
  const [actionAssignee, setActionAssignee] = useState<string>("");
  const [actionPriority, setActionPriority] = useState<string>("MEDIUM");
  const [actionDueDate, setActionDueDate] = useState<string>("");
  const [actionReqId, setActionReqId] = useState<string>("");
  const [actionTaskId, setActionTaskId] = useState<string>("");

  // Notice Banner
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchMeetingDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/meetings/${meetingId}`);
      const data: MeetingDetail = res.data.data;
      setMeeting(data);

      setSummary(data.summary || "");
      setDecisions(data.decisions || "");
      setDiscussionNotes(data.discussion_notes || "");
      setRisksConcerns(data.risks_concerns || "");
      setTranscript(data.transcript || "");
      setRecordingUrl(data.recording_url_or_reference || "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load meeting details.");
    } finally {
      setLoading(false);
    }
  }, [projectId, meetingId]);

  const fetchContextualLists = useCallback(async () => {
    try {
      const [memRes, reqRes, taskRes] = await Promise.all([
        api.get(`/projects/${projectId}/members`),
        api.get(`/projects/${projectId}/requirements`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProjectMembers(memRes.data.data.members || memRes.data.data || []);
      setProjectRequirements(reqRes.data.data.requirements || reqRes.data.data || []);
      setProjectTasks(taskRes.data.data.tasks || taskRes.data.data || []);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    fetchMeetingDetail();
    fetchContextualLists();
  }, [fetchMeetingDetail, fetchContextualLists]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await api.patch(`/projects/${projectId}/meetings/${meetingId}`, {
        summary: summary.trim() || undefined,
        decisions: decisions.trim() || undefined,
        discussion_notes: discussionNotes.trim() || undefined,
        risks_concerns: risksConcerns.trim() || undefined,
      });
      setMeeting(res.data.data);
      setNotice({ message: "Structured meeting notes saved.", type: "success" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ message: err.response?.data?.message || "Failed to save notes.", type: "error" });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!transcript.trim()) {
      setNotice({ message: "Transcript text cannot be empty.", type: "error" });
      return;
    }
    setSavingTranscript(true);
    try {
      const res = await api.put(`/projects/${projectId}/meetings/${meetingId}/transcript`, {
        transcript: transcript.trim(),
        recording_url_or_reference: recordingUrl.trim() || null,
      });
      setMeeting(res.data.data);
      setNotice({ message: "Source transcript saved successfully.", type: "success" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ message: err.response?.data?.message || "Failed to save transcript.", type: "error" });
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    try {
      const res = await api.patch(`/projects/${projectId}/meetings/${meetingId}`, { status: newStatus });
      setMeeting(res.data.data);
      setNotice({ message: `Meeting status updated to ${newStatus}.`, type: "success" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ message: err.response?.data?.message || "Status transition failed.", type: "error" });
    }
  };

  const handleCreateActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim()) {
      setActionError("Action title is required.");
      return;
    }

    setCreatingAction(true);
    setActionError(null);
    try {
      const payload = {
        title: actionTitle.trim(),
        description: actionDesc.trim() || undefined,
        assigned_to: actionAssignee || undefined,
        priority: actionPriority,
        due_date: actionDueDate ? new Date(actionDueDate).toISOString() : undefined,
        requirement_id: actionReqId || undefined,
        task_id: actionTaskId || undefined,
      };

      await api.post(`/projects/${projectId}/meetings/${meetingId}/action-items`, payload);

      setActionModalOpen(false);
      setActionTitle("");
      setActionDesc("");
      setActionAssignee("");
      setActionReqId("");
      setActionTaskId("");
      fetchMeetingDetail();
      setNotice({ message: "Action item created and linked.", type: "success" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to create action item.");
    } finally {
      setCreatingAction(false);
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "PLANNING":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "STANDUP":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "REVIEW":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "RETROSPECTIVE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "REQUIREMENT_DISCUSSION":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "TECHNICAL":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "CLIENT":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case "SCHEDULED":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "IN_PROGRESS":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse";
      case "COMPLETED":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "CANCELLED":
        return "bg-zinc-600/20 text-zinc-400 border-zinc-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
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

  if (loading) {
    return (
      <ProtectedShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-3">
          <Loader2 className="size-8 animate-spin text-cyan-500" />
          <p className="text-xs font-medium">Loading meeting details...</p>
        </div>
      </ProtectedShell>
    );
  }

  if (error || !meeting) {
    return (
      <ProtectedShell>
        <div className="max-w-4xl mx-auto p-12 text-center text-rose-400 space-y-4">
          <AlertCircle className="size-10 mx-auto" />
          <h2 className="text-base font-bold text-white">{error || "Meeting not found"}</h2>
          <Link
            href={`/projects/${projectId}/meetings`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <ArrowLeft className="size-4" /> Return to Meetings List
          </Link>
        </div>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${projectId}/meetings`}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Meetings List
          </Link>
          <div className="text-xs text-slate-400">
            Meeting ID: <span className="font-mono text-slate-300">{meeting.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Meeting Header Banner */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getTypeBadgeStyle(meeting.meeting_type)}`}>
                {meeting.meeting_type.replace("_", " ")}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeStyle(meeting.status)}`}>
                {meeting.status}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
                <Clock className="size-3.5 text-cyan-400" /> {meeting.duration_minutes} Minutes
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{meeting.title}</h1>
            {meeting.description && <p className="text-xs text-slate-300 leading-relaxed">{meeting.description}</p>}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-cyan-400" /> {formatDate(meeting.scheduled_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <UserIcon className="size-3.5 text-cyan-400" /> Organized by <strong className="text-slate-200">{meeting.organizer_name || "Organizer"}</strong>
              </span>
            </div>
          </div>

          {/* Status Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
            {meeting.status === "SCHEDULED" && (
              <button
                onClick={() => handleStatusTransition("IN_PROGRESS")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 cursor-pointer"
              >
                <Play className="size-3.5" /> Start Meeting
              </button>
            )}

            {(meeting.status === "SCHEDULED" || meeting.status === "IN_PROGRESS") && (
              <button
                onClick={() => handleStatusTransition("COMPLETED")}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-500 cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" /> Complete Meeting
              </button>
            )}

            {meeting.status !== "CANCELLED" && (
              <button
                onClick={() => handleStatusTransition("CANCELLED")}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
              >
                <XCircle className="size-3.5 text-rose-400" /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Global Notice */}
        {notice && (
          <div
            className={`rounded-lg p-4 text-xs font-medium border flex items-center justify-between ${
              notice.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                : "bg-rose-950/40 text-rose-300 border-rose-800/60"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" /> {notice.message}
            </span>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Structured Tabs Bar */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "notes"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="size-4" /> Structured Notes
          </button>
          <button
            onClick={() => setActiveTab("participants")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "participants"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="size-4" /> Participants ({meeting.participants.length})
          </button>
          <button
            onClick={() => setActiveTab("agenda")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "agenda"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="size-4" /> Agenda ({meeting.agenda_items.length})
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "transcript"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="size-4" /> Source Transcript
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "actions"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckSquare className="size-4" /> Action Items ({meeting.action_items.length})
          </button>
        </div>

        {/* TAB 1: STRUCTURED NOTES */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Structured Meeting Notes</h3>
                <p className="text-xs text-slate-400">Categorized notes for decisions, discussion topics, and risks</p>
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors cursor-pointer"
              >
                {savingNotes ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save Structured Notes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400">Executive Summary</label>
                <textarea
                  rows={4}
                  placeholder="High-level summary of meeting outcomes..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Key Decisions */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-400">Key Decisions Made</label>
                <textarea
                  rows={4}
                  placeholder="1. Approved architecture for OAuth2&#10;2. Deferred GraphQL migration to Q4"
                  value={decisions}
                  onChange={(e) => setDecisions(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Discussion Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">Discussion & Technical Notes</label>
                <textarea
                  rows={5}
                  placeholder="Detailed discussion topics, technical insights, and architectural debates..."
                  value={discussionNotes}
                  onChange={(e) => setDiscussionNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Risks & Concerns */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-400">Risks, Blockers & Concerns</label>
                <textarea
                  rows={5}
                  placeholder="Identified risks, dependency bottlenecks, or security concerns..."
                  value={risksConcerns}
                  onChange={(e) => setRisksConcerns(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARTICIPANTS */}
        {activeTab === "participants" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Meeting Participants</h3>
                <p className="text-xs text-slate-400">Normalized participant attendance tracking</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Participant</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {meeting.participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs">
                            {p.user_name ? p.user_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span>{p.user_name || "Participant"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{p.user_email || "-"}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {p.attendance_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AGENDA */}
        {activeTab === "agenda" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Structured Meeting Agenda</h3>
                <p className="text-xs text-slate-400">Ordered agenda topics for discussion</p>
              </div>
            </div>

            <div className="space-y-3">
              {meeting.agenda_items.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-6 text-center">No agenda topics defined.</p>
              ) : (
                meeting.agenda_items.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                    <span className="font-mono text-sm font-bold text-cyan-400">{idx + 1}.</span>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      {item.description && <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SOURCE TRANSCRIPT */}
        {activeTab === "transcript" && (
          <div className="space-y-6">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  <FileCode className="size-4" /> SOURCE TRANSCRIPT
                </span>
                {meeting.transcript_updated_at && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Last Updated: {formatDate(meeting.transcript_updated_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Raw, unedited meeting transcript text. Separated from AI summaries for accurate vector embedding & RAG indexing.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Recording Reference / URL</label>
                <input
                  type="text"
                  placeholder="https://storage.synapse.com/recordings/meeting-101.mp4"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Paste Raw Transcript Text *</label>
                <textarea
                  rows={14}
                  placeholder="Paste complete raw speaker transcript here...&#10;[00:01] Speaker A: Hello team..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-200 placeholder-slate-600 leading-relaxed focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveTranscript}
                  disabled={savingTranscript}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors cursor-pointer"
                >
                  {savingTranscript ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save Source Transcript
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ACTION ITEMS */}
        {activeTab === "actions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Meeting Action Items & Traceability</h3>
                <p className="text-xs text-slate-400">Decisions/actions linked to Requirements and Tasks</p>
              </div>

              <button
                onClick={() => setActionModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors cursor-pointer"
              >
                <Plus className="size-4" /> Add Action Item
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              {meeting.action_items.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <CheckSquare className="size-10 mx-auto text-slate-600" />
                  <h4 className="text-sm font-semibold text-slate-300">No action items recorded</h4>
                  <p className="text-xs text-slate-500">Create action items and link them to Requirements or Tasks.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Action Item</th>
                        <th className="py-3.5 px-4">Assignee</th>
                        <th className="py-3.5 px-4">Priority</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Linked Requirement</th>
                        <th className="py-3.5 px-4">Linked Task</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {meeting.action_items.map((ai) => (
                        <tr key={ai.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white max-w-xs truncate">{ai.title}</td>
                          <td className="py-3.5 px-4 text-slate-300">{ai.assignee_name || "Unassigned"}</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {ai.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {ai.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {ai.requirement_key ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <FileText className="size-3" /> {ai.requirement_key}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {ai.task_title ? (
                              <span className="inline-flex items-center gap-1 text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 max-w-[150px] truncate">
                                <Layers className="size-3" /> {ai.task_title}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD ACTION ITEM MODAL */}
        {actionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="size-5 text-cyan-400" /> New Action Item
                </h3>
                <button onClick={() => setActionModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="size-5" />
                </button>
              </div>

              {actionError && (
                <div className="rounded-lg bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" /> {actionError}
                </div>
              )}

              <form onSubmit={handleCreateActionItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Action Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Configure JWT secret environment variables"
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee</label>
                    <select
                      value={actionAssignee}
                      onChange={(e) => setActionAssignee(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {projectMembers.map((m: any) => (
                        <option key={m.id} value={m.user_id || m.user?.id}>
                          {m.user_name || m.user?.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={actionPriority}
                      onChange={(e) => setActionPriority(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Linked Requirement (Traceability)</label>
                    <select
                      value={actionReqId}
                      onChange={(e) => setActionReqId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">None</option>
                      {projectRequirements.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.requirement_key}: {r.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Linked Task</label>
                    <select
                      value={actionTaskId}
                      onChange={(e) => setActionTaskId(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">None</option>
                      {projectTasks.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={actionDueDate}
                    onChange={(e) => setActionDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActionModalOpen(false)}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAction}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors cursor-pointer"
                  >
                    {creatingAction && <Loader2 className="size-3.5 animate-spin" />} Create Action Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
