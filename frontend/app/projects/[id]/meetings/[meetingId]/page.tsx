"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import WorkflowProgressTracker, { WorkflowStep, StepStatus } from "@/components/WorkflowProgressTracker";
import { deriveMeetingWorkflowState } from "@/lib/meetingWorkflow";
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
  Sparkles,
  Bot,
  Check,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Sliders,
  ChevronRight,
  Tag,
  Briefcase,
  HelpCircle,
  Copy,
} from "lucide-react";

export interface TaskSuggestion {
  id: string;
  analysis_id: string;
  meeting_id: string;
  project_id: string;
  title: string;
  description: string;
  workstream: string;
  priority: string;
  story_points?: number;
  requirement_id?: string | null;
  human_decision: "PENDING" | "ACCEPTED" | "MODIFIED" | "REJECTED";
  human_comment?: string | null;
  created_task_id?: string | null;
  created_at: string;
}

export interface MeetingAnalysis {
  id: string;
  meeting_id: string;
  project_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  model_name: string;
  prompt_version: string;
  summary?: string | null;
  decisions: string[];
  risks: string[];
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
  task_suggestions: TaskSuggestion[];
}

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
  const [activeTab, setActiveTab] = useState<"notes" | "participants" | "agenda" | "transcript" | "actions" | "intelligence">("notes");

  // Meeting Intelligence Workflow State
  const [analyses, setAnalyses] = useState<MeetingAnalysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [intelligenceReviewed, setIntelligenceReviewed] = useState<boolean>(false);
  const [activeWorkflowView, setActiveWorkflowView] = useState<string | null>(null);

  // Suggestion Modification Modal State
  const [editingSuggestion, setEditingSuggestion] = useState<TaskSuggestion | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editPriority, setEditPriority] = useState<string>("MEDIUM");
  const [editWorkstream, setEditWorkstream] = useState<string>("GENERAL");
  const [editStoryPoints, setEditStoryPoints] = useState<number>(1);
  const [editComment, setEditComment] = useState<string>("");
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);

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

  const fetchAnalyses = useCallback(async () => {
    setLoadingAnalyses(true);
    try {
      const res = await api.get(`/projects/${projectId}/meetings/${meetingId}/analyses`);
      const data: MeetingAnalysis[] = res.data.data || [];
      if (data.length > 0) {
        try {
          const detailRes = await api.get(
            `/projects/${projectId}/meetings/${meetingId}/analyses/${data[0].id}`
          );
          const fullDetail: MeetingAnalysis = detailRes.data.data;
          setAnalyses([fullDetail, ...data.slice(1)]);
        } catch {
          setAnalyses(data);
        }
      } else {
        setAnalyses([]);
      }
    } catch {
      // silently handle if analyses not run yet
    } finally {
      setLoadingAnalyses(false);
    }
  }, [projectId, meetingId]);

  useEffect(() => {
    fetchMeetingDetail();
    fetchContextualLists();
    fetchAnalyses();
  }, [fetchMeetingDetail, fetchContextualLists, fetchAnalyses]);

  // Re-fetch analyses when Intelligence tab opens without triggering analysis
  useEffect(() => {
    if (activeTab === "intelligence") {
      fetchAnalyses();
    }
  }, [activeTab, fetchAnalyses]);

  // Synchronize intelligenceReviewed from localStorage keyed by meetingId and analysis.id
  useEffect(() => {
    if (analyses.length > 0 && analyses[0].id) {
      try {
        const stored = localStorage.getItem(
          `synapse_meeting_${meetingId}_analysis_${analyses[0].id}_reviewed`
        );
        setIntelligenceReviewed(stored === "true");
      } catch {
        setIntelligenceReviewed(false);
      }
    } else {
      setIntelligenceReviewed(false);
    }
  }, [analyses, meetingId]);

  const handleContinueToActionItems = () => {
    const currentAnalysis = analyses.length > 0 ? analyses[0] : null;
    if (currentAnalysis?.id) {
      try {
        localStorage.setItem(
          `synapse_meeting_${meetingId}_analysis_${currentAnalysis.id}_reviewed`,
          "true"
        );
      } catch {}
    }
    setIntelligenceReviewed(true);
    setActiveWorkflowView("actions");
  };

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

  const handleStartMeeting = async () => {
    try {
      await api.patch(`/projects/${projectId}/meetings/${meetingId}`, { status: "IN_PROGRESS" });
      router.push(`/projects/${projectId}/meetings/${meetingId}/room`);
    } catch (err: any) {
      setNotice({ message: err.response?.data?.message || "Failed to start meeting.", type: "error" });
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

  const handleRunAnalysis = async () => {
    if (!meeting?.transcript || !meeting.transcript.trim()) {
      setNotice({ message: "Add a meeting transcript to begin Meeting Intelligence.", type: "error" });
      setActiveTab("transcript");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await api.post(`/projects/${projectId}/meetings/${meetingId}/analyze`);
      const newAnalysis: MeetingAnalysis = res.data.data;
      setAnalyses((prev) => [newAnalysis, ...prev.filter((a) => a.id !== newAnalysis.id)]);
      setIntelligenceReviewed(false);
      try {
        localStorage.removeItem(`synapse_meeting_${meetingId}_analysis_${newAnalysis.id}_reviewed`);
      } catch {}
      setActiveWorkflowView("review");
      setNotice({ message: "Meeting Intelligence successfully generated by AI engine.", type: "success" });
      setTimeout(() => setNotice(null), 4000);
      fetchMeetingDetail();
    } catch (err: any) {
      setNotice({
        message: err.response?.data?.message || "Failed to execute AI Meeting Intelligence analysis.",
        type: "error",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSuggestionDecision = async (
    suggestionId: string,
    decision: "ACCEPTED" | "MODIFIED" | "REJECTED",
    modifications?: {
      title?: string;
      description?: string;
      priority?: string;
      workstream?: string;
      story_points?: number;
      comment?: string;
    }
  ) => {
    if (!latestAnalysis) return;
    setDecisionLoadingId(suggestionId);
    try {
      const payload: any = {
        human_decision: decision,
      };
      if (decision === "MODIFIED" && modifications) {
        if (modifications.title) payload.edited_title = modifications.title;
        if (modifications.description) payload.edited_description = modifications.description;
        if (modifications.priority) payload.edited_priority = modifications.priority;
        if (modifications.workstream) payload.edited_workstream = modifications.workstream;
        if (modifications.story_points !== undefined) payload.edited_story_points = modifications.story_points;
        if (modifications.comment) payload.human_comment = modifications.comment;
      }

      const res = await api.patch(
        `/projects/${projectId}/meetings/${meetingId}/analyses/${latestAnalysis.id}/suggestions/${suggestionId}`,
        payload
      );
      const updatedSuggestion: TaskSuggestion = res.data.data;

      setAnalyses((prev) =>
        prev.map((a) => {
          if (a.id === latestAnalysis.id) {
            return {
              ...a,
              task_suggestions: a.task_suggestions.map((s) =>
                s.id === suggestionId ? updatedSuggestion : s
              ),
            };
          }
          return a;
        })
      );

      if (decision === "ACCEPTED" || decision === "MODIFIED") {
        setNotice({
          message: `Task suggestion ${decision === "MODIFIED" ? "modified and " : ""}converted to project task!`,
          type: "success",
        });
        fetchMeetingDetail();
        fetchContextualLists();
      } else {
        setNotice({ message: "Task suggestion rejected.", type: "success" });
      }

      // Check if all suggestions are now decided
      const remainingPending = latestAnalysis.task_suggestions.filter(
        (s) => s.id !== suggestionId && s.human_decision === "PENDING"
      ).length;
      if (remainingPending === 0 && activeWorkflowView === "actions") {
        setActiveWorkflowView(null);
      }

      setTimeout(() => setNotice(null), 4000);
      setEditingSuggestion(null);
    } catch (err: any) {
      setNotice({
        message: err.response?.data?.message || "Failed to update suggestion decision.",
        type: "error",
      });
    } finally {
      setDecisionLoadingId(null);
    }
  };

  const openModifyModal = (s: TaskSuggestion) => {
    setEditingSuggestion(s);
    setEditTitle(s.title);
    setEditDesc(s.description);
    setEditPriority(s.priority);
    setEditWorkstream(s.workstream || "GENERAL");
    setEditStoryPoints(s.story_points || 1);
    setEditComment(s.human_comment || "");
  };

  // Workflow State Engine
  const latestAnalysis = analyses.length > 0 ? analyses[0] : null;
  const hasTranscript = Boolean(meeting?.transcript && meeting.transcript.trim().length > 0);
  const workflowState = deriveMeetingWorkflowState({
    hasTranscript,
    latestAnalysis,
    isAnalyzing: analyzing,
    intelligenceReviewed,
  });
  const naturalCurrentStepId = workflowState.naturalStepId;
  const isAnalysisFailed = workflowState.isAnalysisFailed;
  const isAnalysisRunning = workflowState.isAnalysisRunning;
  const progressPercent = workflowState.progressPercent;


  // Polling for live analysis if status is QUEUED or RUNNING
  useEffect(() => {
    if (!latestAnalysis) return;
    if (latestAnalysis.status === "QUEUED" || latestAnalysis.status === "RUNNING") {
      const interval = setInterval(async () => {
        try {
          const res = await api.get(
            `/projects/${projectId}/meetings/${meetingId}/analyses/${latestAnalysis.id}`
          );
          const updatedAnalysis: MeetingAnalysis = res.data.data;
          setAnalyses((prev) =>
            prev.map((a) => (a.id === updatedAnalysis.id ? updatedAnalysis : a))
          );
          if (updatedAnalysis.status === "COMPLETED") {
            setAnalyzing(false);
            setActiveWorkflowView("review");
            setIntelligenceReviewed(false);
            fetchMeetingDetail();
            fetchContextualLists();
            clearInterval(interval);
          } else if (updatedAnalysis.status === "FAILED") {
            setAnalyzing(false);
            clearInterval(interval);
          }
        } catch {
          // ignore transient poll errors
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [latestAnalysis?.id, latestAnalysis?.status, projectId, meetingId, fetchMeetingDetail, fetchContextualLists]);

  const effectiveCurrentStepId = activeWorkflowView || naturalCurrentStepId;

  const stepOrder = ["transcript", "analysis", "review", "actions", "tasks", "complete"] as const;
  const currentNaturalIndex = stepOrder.indexOf(naturalCurrentStepId);

  const getStepStatus = (stepId: typeof stepOrder[number]): StepStatus => {
    if (stepId === "analysis" && isAnalysisFailed) return "blocked";
    if (stepId === "transcript" && !hasTranscript) return "current";
    const idx = stepOrder.indexOf(stepId);
    if (idx < currentNaturalIndex) return "completed";
    if (idx === currentNaturalIndex) {
      if (stepId === "complete" && naturalCurrentStepId === "complete") return "completed";
      return "current";
    }
    return "pending";
  };

  const workflowSteps: WorkflowStep[] = [
    {
      id: "transcript",
      label: "Transcript",
      status: getStepStatus("transcript"),
      ownerType: "user",
      ownerDisplay: {
        name: meeting?.organizer_name || "Meeting Organizer",
        role: "Product Manager",
      },
      description: hasTranscript
        ? "Meeting source transcript saved and ready for contextual intelligence."
        : "Add a meeting transcript to begin Meeting Intelligence.",
      actionText: hasTranscript ? "View Source Transcript" : "Add Transcript",
      onAction: () => {
        if (!hasTranscript) {
          setActiveTab("transcript");
        } else {
          setActiveWorkflowView("transcript");
        }
      },
    },
    {
      id: "analysis",
      label: "AI Analysis",
      status: getStepStatus("analysis"),
      ownerType: "ai",
      ownerDisplay: {
        name: "Synapse AI",
        role: "AI Analysis Engine",
      },
      description: isAnalysisFailed
        ? "Meeting analysis could not be completed."
        : isAnalysisRunning
        ? "AI is analyzing the transcript with project context."
        : latestAnalysis?.status === "COMPLETED"
        ? `AI analysis completed. Extracted summary, decisions, risks, and ${latestAnalysis.task_suggestions?.length || 0} task suggestions.`
        : hasTranscript
        ? "Ready to analyze transcript with project context."
        : "Pending meeting transcript ingestion.",
      actionText: isAnalysisFailed
        ? "Retry AI Analysis"
        : isAnalysisRunning
        ? "Analyzing..."
        : latestAnalysis?.status === "COMPLETED"
        ? "Re-run Analysis"
        : "Run AI Analysis",
      actionLoading: isAnalysisRunning,
      actionDisabled: !hasTranscript || isAnalysisRunning,
      onAction: handleRunAnalysis,
    },
    {
      id: "review",
      label: "Review Intelligence",
      status: getStepStatus("review"),
      ownerType: "user",
      ownerDisplay: {
        name: meeting?.organizer_name || "Lead Reviewer",
        role: "Human Decision Maker",
      },
      description: "Review synthesized executive summary, architectural decisions, and project risks.",
      actionText: naturalCurrentStepId === "review" ? "Continue to Action Items" : "Review Findings",
      actionDisabled: !latestAnalysis || latestAnalysis.status !== "COMPLETED",
      onAction: () => {
        if (naturalCurrentStepId === "review") {
          handleContinueToActionItems();
        } else {
          setActiveWorkflowView("review");
        }
      },
    },
    {
      id: "actions",
      label: "Review Action Items",
      status: getStepStatus("actions"),
      ownerType: "user",
      ownerDisplay: {
        name: meeting?.organizer_name || "Project Lead",
        role: "Task Coordinator",
      },
      description: "Review AI-suggested action items and decide Accept / Modify / Reject.",
      actionText: "Review Action Items",
      actionDisabled: !latestAnalysis || latestAnalysis.status !== "COMPLETED",
      onAction: () => setActiveWorkflowView("actions"),
    },
    {
      id: "tasks",
      label: "Task Conversion",
      status: getStepStatus("tasks"),
      ownerType: "user",
      ownerDisplay: {
        name: meeting?.organizer_name || "Project Manager",
        role: "Sprint Lead",
      },
      description: "Accepted and modified suggestions are converted into project backlog tasks.",
      actionText: "View Task Conversion",
      actionDisabled: !latestAnalysis || latestAnalysis.status !== "COMPLETED",
      onAction: () => setActiveWorkflowView("tasks"),
    },
    {
      id: "complete",
      label: "Complete",
      status: getStepStatus("complete"),
      ownerType: "user",
      ownerDisplay: {
        name: "Sprint Team",
        role: "Execution Ready",
      },
      description: "Meeting Intelligence workflow completed. All findings triaged and tasks converted.",
      actionText: "View Workflow Summary",
      actionDisabled: !latestAnalysis || latestAnalysis.status !== "COMPLETED",
      onAction: () => setActiveWorkflowView("complete"),
    },
  ];

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
                onClick={handleStartMeeting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 cursor-pointer"
              >
                <Play className="size-3.5" /> Start Meeting
              </button>
            )}

            {meeting.status === "IN_PROGRESS" && (
              <button
                onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}/room`)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 cursor-pointer animate-pulse"
              >
                <Video className="size-3.5" /> Join Meeting Room
              </button>
            )}

            {(meeting.status === "SCHEDULED" || meeting.status === "IN_PROGRESS") && (
              <button
                onClick={() => handleStatusTransition("COMPLETED")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 cursor-pointer"
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

        {/* Active Live Meeting Room Banner */}
        {meeting.status === "IN_PROGRESS" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-4 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-300">Meeting is currently LIVE in progress</p>
                <p className="text-[11px] text-slate-400">The meeting room is open. Enter the room to collaborate with participants.</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}/room`)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0 cursor-pointer shadow-md"
            >
              <Video className="size-3.5" /> Enter Room
            </button>
          </div>
        )}

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
          <button
            onClick={() => setActiveTab("intelligence")}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "intelligence"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="size-4 text-emerald-400" /> Intelligence
            {latestAnalysis && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                AI
              </span>
            )}
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
                <label className="block text-xs font-bold uppercase tracking-wider text-primary">Key Decisions Made</label>
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
                Raw, unedited meeting transcript text, indexed for semantic search and AI intelligence.
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
                              <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 max-w-[150px] truncate">
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

        {/* TAB 6: MEETING INTELLIGENCE WORKFLOW */}
        {activeTab === "intelligence" && (
          <div className="space-y-6">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-400" /> Meeting Intelligence Workflow
                </h3>
                <p className="text-xs text-slate-400">
                  Live linear pipeline from transcript ingestion to verified project backlog tasks
                </p>
              </div>

              {latestAnalysis && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-slate-400 border border-slate-800 bg-slate-900 px-2.5 py-1 rounded-lg">
                    Analysis: <strong className="text-emerald-400">Synapse AI</strong>
                  </span>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={analyzing || !hasTranscript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    <span>Re-run Analysis</span>
                  </button>
                </div>
              )}
            </div>

            {/* LIVE LINEAR WORKFLOW TRACKER */}
            <WorkflowProgressTracker
              steps={workflowSteps}
              currentStepId={effectiveCurrentStepId}
              onStepClick={(stepId) => setActiveWorkflowView(stepId)}
              title="Meeting Intelligence Pipeline"
              subtitle="Workflow indicator tracking execution, ownership, and human decisions"
              progressPercent={progressPercent}
            />

            {/* COMPLETED ANALYSIS METRICS SUMMARY (Shown after analysis completes) */}
            {latestAnalysis && latestAnalysis.status === "COMPLETED" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Decisions
                    </span>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">
                      {latestAnalysis.decisions?.length || 0}
                    </p>
                  </div>
                  <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="size-5" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Project Risks
                    </span>
                    <p className="text-xl font-bold text-amber-400 mt-0.5">
                      {latestAnalysis.risks?.length || 0}
                    </p>
                  </div>
                  <div className="size-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="size-5" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Action Items
                    </span>
                    <p className="text-xl font-bold text-cyan-400 mt-0.5">
                      {meeting.action_items?.length || 0}
                    </p>
                  </div>
                  <div className="size-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <CheckSquare className="size-5" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Task Suggestions
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <p className="text-xl font-bold text-white">
                        {latestAnalysis.task_suggestions?.length || 0}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        ({latestAnalysis.task_suggestions?.filter((s) => s.human_decision === "PENDING").length || 0} pending)
                      </span>
                    </div>
                  </div>
                  <div className="size-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sliders className="size-5" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP DETAIL PANELS */}
            {/* 1. TRANSCRIPT PANEL */}
            {effectiveCurrentStepId === "transcript" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FileCode className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Source Transcript Workflow</h4>
                      <p className="text-xs text-slate-400">Ingestion step powering project intelligence</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                      hasTranscript
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {hasTranscript ? "Transcript Ready" : "Transcript Missing"}
                  </span>
                </div>

                {!hasTranscript ? (
                  /* EMPTY STATE REQUIRED BY SPEC */
                  <div className="text-center py-10 px-4 space-y-4 max-w-lg mx-auto">
                    <div className="size-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <FileCode className="size-6 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-white">No Meeting Transcript</h5>
                      <p className="text-xs text-slate-300">
                        Add a meeting transcript to begin Meeting Intelligence.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Synapse will analyze the conversation against project requirements, extracting decisions, risks, and task candidates.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("transcript")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <FileCode className="size-4" /> Go to Source Transcript Tab
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Recorded Content Preview</span>
                        <span>{meeting.transcript?.length || 0} characters</span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {meeting.transcript}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab("transcript")}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit3 className="size-3.5" /> Edit Transcript
                      </button>

                      <button
                        onClick={() => setActiveWorkflowView("analysis")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <span>Proceed to AI Analysis</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. AI ANALYSIS PANEL */}
            {effectiveCurrentStepId === "analysis" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Analysis Engine</h4>
                      <p className="text-xs text-slate-400">Automated Project Intelligence</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Owner: Synapse AI
                  </span>
                </div>

                {isAnalysisFailed ? (
                  <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-6 text-center space-y-3">
                    <div className="size-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                      <AlertCircle className="size-6" />
                    </div>
                    <h5 className="text-sm font-bold text-white">Meeting analysis could not be completed.</h5>
                    <p className="text-xs text-rose-300 max-w-md mx-auto">
                      {latestAnalysis?.error_message || "An unexpected error occurred during intelligence analysis. Your transcript remains safely saved."}
                    </p>
                    <button
                      onClick={handleRunAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles className="size-3.5" /> Retry AI Analysis
                    </button>
                  </div>
                ) : isAnalysisRunning ? (
                  <div className="text-center py-12 px-4 space-y-4 max-w-md mx-auto">
                    <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-white">Analyzing meeting...</h5>
                      <p className="text-xs text-slate-300">
                        Retrieving relevant project requirements and synthesizing structured meeting intelligence.
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">Status: RUNNING</p>
                    </div>
                  </div>
                ) : !latestAnalysis ? (
                  <div className="text-center py-10 px-4 space-y-4 max-w-lg mx-auto">
                    <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                      <Sparkles className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-white">Ready to Analyze</h5>
                      <p className="text-xs text-slate-300">
                        The transcript is saved. Run AI Analysis to extract structured notes, key decisions, project risks, and suggested backlog tasks.
                      </p>
                    </div>
                    <button
                      onClick={handleRunAnalysis}
                      disabled={!hasTranscript}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles className="size-4" /> Run AI Analysis
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">AI Analysis Execution Finished</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-3.5" /> Project context used
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Analysis Engine
                          </span>
                          <span className="font-semibold text-slate-200 mt-1 block truncate">
                            Synapse AI
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Total Latency
                          </span>
                          <span className="font-mono font-semibold text-emerald-400 mt-1 block">
                            {latestAnalysis.total_latency_ms?.toFixed(0) || 0} ms
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Project Context
                          </span>
                          <span className="font-mono font-semibold text-cyan-400 mt-1 block">
                            {latestAnalysis.retrieval_latency_ms?.toFixed(0) || 0} ms
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Generation
                          </span>
                          <span className="font-mono font-semibold text-purple-400 mt-1 block">
                            {latestAnalysis.generation_latency_ms?.toFixed(0) || 0} ms
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={handleRunAnalysis}
                        disabled={analyzing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Sparkles className="size-3.5 text-emerald-400" /> Re-run AI Analysis
                      </button>

                      <button
                        onClick={() => setActiveWorkflowView("review")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <span>Proceed to Review Intelligence</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. REVIEW INTELLIGENCE PANEL */}
            {effectiveCurrentStepId === "review" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Review Synthesized Intelligence</h4>
                      <p className="text-xs text-slate-400">Executive summary, key decisions, and identified risks</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Owner: {meeting.organizer_name || "Lead Reviewer"}
                  </span>
                </div>

                {!latestAnalysis || latestAnalysis.status !== "COMPLETED" ? (
                  <div className="text-center py-12 px-4 space-y-3 max-w-md mx-auto">
                    <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      <Sparkles className="size-5" />
                    </div>
                    <h5 className="text-sm font-semibold text-white">
                      {latestAnalysis?.status === "FAILED"
                        ? "AI Analysis Could Not Complete"
                        : latestAnalysis?.status === "QUEUED" || latestAnalysis?.status === "RUNNING"
                        ? "AI Analysis in Progress"
                        : "AI Analysis Not Yet Run"}
                    </h5>
                    <p className="text-xs text-slate-400">
                      {latestAnalysis?.status === "FAILED"
                        ? "Please return to Step 2 (AI Analysis) to review the error message and retry."
                        : latestAnalysis?.status === "QUEUED" || latestAnalysis?.status === "RUNNING"
                        ? "The intelligence pipeline is extracting findings. Please wait for completion."
                        : "Run AI Analysis on the transcript in Step 2 to generate executive summaries, decisions, and risks."}
                    </p>
                    <button
                      onClick={() => setActiveWorkflowView("analysis")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" /> Go to AI Analysis Step
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-emerald-400" />
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Executive Summary
                        </h5>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed">
                        {latestAnalysis.summary || "No executive summary generated."}
                      </div>
                    </div>

                    {/* Key Decisions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Key Decisions ({latestAnalysis.decisions?.length || 0})
                        </h5>
                      </div>
                      {latestAnalysis.decisions?.length > 0 ? (
                        <div className="space-y-2">
                          {latestAnalysis.decisions.map((dec, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3 flex items-start gap-3"
                            >
                              <span className="size-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs font-medium text-slate-200 leading-relaxed">{dec}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No explicit decisions recorded.</p>
                      )}
                    </div>

                    {/* Risks & Concerns */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-400" />
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Identified Risks & Concerns ({latestAnalysis.risks?.length || 0})
                        </h5>
                      </div>
                      {latestAnalysis.risks?.length > 0 ? (
                        <div className="space-y-2">
                          {latestAnalysis.risks.map((risk, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-3 flex items-start gap-3"
                            >
                              <span className="size-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                !
                              </span>
                              <p className="text-xs font-medium text-slate-200 leading-relaxed">{risk}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No significant risks identified.</p>
                      )}
                    </div>

                    {/* Project Context & Analysis Metadata */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">AI Analysis Engine & Project Context</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-3.5" /> Project context used
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Analysis Engine
                          </span>
                          <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                            Synapse AI
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Total Latency
                          </span>
                          <span className="font-mono font-semibold text-emerald-400 mt-0.5 block">
                            {latestAnalysis.total_latency_ms?.toFixed(0) || 0} ms
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Project Context
                          </span>
                          <span className="font-mono font-semibold text-cyan-400 mt-0.5 block">
                            {latestAnalysis.retrieval_latency_ms?.toFixed(0) || 0} ms
                          </span>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Generation
                          </span>
                          <span className="font-mono font-semibold text-purple-400 mt-0.5 block">
                            {latestAnalysis.generation_latency_ms?.toFixed(0) || 0} ms
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-xs text-slate-400">
                        Review summary, decisions, and risks before triaging action items.
                      </span>
                      <button
                        onClick={handleContinueToActionItems}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <span>Continue to Action Items</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. REVIEW ACTION ITEMS PANEL */}
            {effectiveCurrentStepId === "actions" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-8">
                {/* Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckSquare className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Review Action Items & Task Suggestions</h4>
                      <p className="text-xs text-slate-400">
                        Review meeting action items and decide Accept, Modify, or Reject on AI task suggestions.
                      </p>
                    </div>
                  </div>

                  {latestAnalysis?.task_suggestions && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "ACCEPTED" || s.human_decision === "MODIFIED").length} Accepted
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "PENDING").length} Pending
                      </span>
                      {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "REJECTED").length > 0 && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "REJECTED").length} Rejected
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION A: MEETING ACTION ITEMS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <span>A. Meeting Action Items</span>
                        <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {meeting.action_items.length}
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-400">Participant tasks extracted and linked directly to this meeting</p>
                    </div>
                    <button
                      onClick={() => setActionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="size-3.5" /> Add Action Item
                    </button>
                  </div>

                  {meeting.action_items.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-slate-400 text-xs space-y-1">
                      <p>No action items currently linked to this meeting.</p>
                      <p className="text-[11px] text-slate-500">You can create custom action items or accept AI task suggestions below.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {meeting.action_items.map((ai) => (
                        <div
                          key={ai.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 max-w-xl">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{ai.title}</span>
                              <span
                                className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${
                                  ai.priority === "URGENT"
                                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                    : ai.priority === "HIGH"
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                                }`}
                              >
                                {ai.priority}
                              </span>
                            </div>
                            {ai.description && (
                              <p className="text-xs text-slate-400 line-clamp-2">{ai.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                            <span className="flex items-center gap-1">
                              <UserIcon className="size-3.5 text-cyan-400" />
                              {ai.assignee_name || "Unassigned"}
                            </span>
                            {ai.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3.5 text-cyan-400" />
                                {formatDate(ai.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION B: AI TASK SUGGESTIONS */}
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <span>B. AI Task Suggestions</span>
                      <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {latestAnalysis?.task_suggestions?.length || 0}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Candidate backlog items extracted by AI. Human review: Accept, Modify, or Reject to trigger backlog creation.
                    </p>
                  </div>

                  {!latestAnalysis || latestAnalysis.task_suggestions.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-slate-400 text-xs">
                      No task suggestions generated for this meeting.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {latestAnalysis.task_suggestions.map((suggestion) => {
                        const isPending = suggestion.human_decision === "PENDING";
                        const isAccepted = suggestion.human_decision === "ACCEPTED";
                        const isModified = suggestion.human_decision === "MODIFIED";
                        const isRejected = suggestion.human_decision === "REJECTED";
                        const isLoading = decisionLoadingId === suggestion.id;

                        return (
                          <div
                            key={suggestion.id}
                            className={`rounded-xl border p-4.5 transition-all ${
                              isAccepted || isModified
                                ? "border-emerald-500/30 bg-emerald-950/10"
                                : isRejected
                                ? "border-slate-800/80 bg-slate-950/40 opacity-60"
                                : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              {/* Suggestion Info */}
                              <div className="space-y-2 max-w-3xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {suggestion.workstream}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                      suggestion.priority === "URGENT"
                                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                        : suggestion.priority === "HIGH"
                                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                        : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                                    }`}
                                  >
                                    {suggestion.priority}
                                  </span>
                                  {suggestion.story_points && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                      {suggestion.story_points} Story Pts
                                    </span>
                                  )}

                                  {/* Decision Pill */}
                                  {isAccepted && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      <Check className="size-3" /> Accepted → Task Created
                                    </span>
                                  )}
                                  {isModified && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                      <Check className="size-3" /> Modified → Task Created
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      <X className="size-3" /> Rejected
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-sm font-bold text-white tracking-tight">
                                  {suggestion.title}
                                </h5>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {suggestion.description}
                                </p>

                                {suggestion.human_comment && (
                                  <p className="text-[11px] text-slate-400 italic">
                                    Reviewer note: "{suggestion.human_comment}"
                                  </p>
                                )}
                              </div>

                              {/* Human Decision CTAs */}
                              <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                                {isPending ? (
                                  <>
                                    <button
                                      onClick={() => handleSuggestionDecision(suggestion.id, "ACCEPTED")}
                                      disabled={isLoading}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                    >
                                      {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                      <span>Accept</span>
                                    </button>

                                    <button
                                      onClick={() => openModifyModal(suggestion)}
                                      disabled={isLoading}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <Edit3 className="size-3.5" />
                                      <span>Modify</span>
                                    </button>

                                    <button
                                      onClick={() => handleSuggestionDecision(suggestion.id, "REJECTED")}
                                      disabled={isLoading}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <X className="size-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {(isAccepted || isModified) && suggestion.created_task_id && (
                                      <Link
                                        href={`/projects/${projectId}/backlog`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                                      >
                                        <Layers className="size-3.5" />
                                        <span>View Task in Backlog</span>
                                      </Link>
                                    )}
                                    <button
                                      onClick={() => openModifyModal(suggestion)}
                                      className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
                                    >
                                      Edit Decision
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 4 Footer Guidance */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
                  {latestAnalysis?.task_suggestions?.some((s) => s.human_decision === "PENDING") ? (
                    <span className="text-slate-400">
                      Decide all task suggestions (Accept, Modify, or Reject) to advance to Task Conversion.
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" /> All task suggestions triaged. Converted tasks are ready.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 5. TASK CONVERSION PANEL */}
            {effectiveCurrentStepId === "tasks" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Sliders className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Task Conversion Status</h4>
                      <p className="text-xs text-slate-400">
                        Accepted and modified suggestions converted into project tasks in the backlog.
                      </p>
                    </div>
                  </div>

                  {latestAnalysis?.task_suggestions && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "ACCEPTED" || s.human_decision === "MODIFIED").length} Converted to Tasks
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "REJECTED").length} Excluded
                      </span>
                    </div>
                  )}
                </div>

                {!latestAnalysis || latestAnalysis.task_suggestions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No task suggestions available for conversion.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Converted Tasks List */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Converted Project Tasks
                      </h5>
                      {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "ACCEPTED" || s.human_decision === "MODIFIED").length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No suggestions were accepted or modified.</p>
                      ) : (
                        latestAnalysis.task_suggestions
                          .filter((s) => s.human_decision === "ACCEPTED" || s.human_decision === "MODIFIED")
                          .map((suggestion) => (
                            <div
                              key={suggestion.id}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1 max-w-xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-white">{suggestion.title}</span>
                                  <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {suggestion.human_decision === "ACCEPTED" ? "Accepted" : "Modified"}
                                  </span>
                                  <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {suggestion.workstream}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 line-clamp-2">{suggestion.description}</p>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {suggestion.created_task_id ? (
                                  <Link
                                    href={`/projects/${projectId}/backlog`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-xs"
                                  >
                                    <Layers className="size-3.5" />
                                    <span>View in Backlog</span>
                                  </Link>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-medium">
                                    <Loader2 className="size-3.5 animate-spin" /> Converting...
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    {/* Excluded Suggestions List */}
                    {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "REJECTED").length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-slate-800">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                          Rejected Suggestions (Excluded from Backlog)
                        </h5>
                        <div className="space-y-2">
                          {latestAnalysis.task_suggestions
                            .filter((s) => s.human_decision === "REJECTED")
                            .map((sug) => (
                              <div
                                key={sug.id}
                                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 flex items-center justify-between text-xs text-slate-400"
                              >
                                <span>{sug.title}</span>
                                <span className="text-[11px] text-rose-400 font-semibold">Rejected</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Link to Complete */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">
                        Task conversion is automatically synchronized with the project backlog.
                      </span>
                      <button
                        onClick={() => setActiveWorkflowView("complete")}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <span>View Workflow Summary</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. COMPLETE PANEL */}
            {effectiveCurrentStepId === "complete" && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-8 text-center space-y-6">
                <div className="size-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="size-8" />
                </div>

                <div className="space-y-2 max-w-xl mx-auto">
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    Meeting Intelligence Workflow Complete
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Source transcript has been analyzed, intelligence findings reviewed, and task suggestions triaged into actionable project backlog items.
                  </p>
                </div>

                {latestAnalysis && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Tasks Created
                      </span>
                      <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                        {latestAnalysis.task_suggestions.filter((s) => s.human_decision === "ACCEPTED" || s.human_decision === "MODIFIED").length}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Decisions Cataloged
                      </span>
                      <span className="text-lg font-bold text-white mt-0.5 block">
                        {latestAnalysis.decisions?.length || 0}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Risks Tracked
                      </span>
                      <span className="text-lg font-bold text-amber-400 mt-0.5 block">
                        {latestAnalysis.risks?.length || 0}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Action Items
                      </span>
                      <span className="text-lg font-bold text-cyan-400 mt-0.5 block">
                        {meeting.action_items?.length || 0}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href={`/projects/${projectId}/backlog`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <Layers className="size-4" /> Go to Project Tasks
                  </Link>
                  <button
                    onClick={() => setActiveWorkflowView("tasks")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sliders className="size-4 text-emerald-400" /> Review Suggestions Again
                  </button>
                  <button
                    onClick={() => setActiveWorkflowView("review")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FileText className="size-4 text-cyan-400" /> Review Intelligence Findings
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODIFY TASK SUGGESTION MODAL */}
        {editingSuggestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="size-5 text-emerald-400" /> Modify & Accept Task Suggestion
                </h3>
                <button
                  onClick={() => setEditingSuggestion(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSuggestionDecision(editingSuggestion.id, "MODIFIED", {
                    title: editTitle.trim(),
                    description: editDesc.trim(),
                    priority: editPriority,
                    workstream: editWorkstream,
                    story_points: editStoryPoints,
                    comment: editComment.trim() || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Workstream</label>
                    <select
                      value={editWorkstream}
                      onChange={(e) => setEditWorkstream(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="GENERAL">General</option>
                      <option value="FRONTEND">Frontend</option>
                      <option value="BACKEND">Backend</option>
                      <option value="DESIGN">Design</option>
                      <option value="QA">QA</option>
                      <option value="DEVOPS">DevOps</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Story Points</label>
                    <input
                      type="number"
                      min={1}
                      max={13}
                      value={editStoryPoints}
                      onChange={(e) => setEditStoryPoints(parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reviewer Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Scoped down story points based on existing services"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingSuggestion(null)}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={decisionLoadingId === editingSuggestion.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    {decisionLoadingId === editingSuggestion.id && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Save & Accept Task</span>
                  </button>
                </div>
              </form>
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
                    placeholder="e.g. Configure authentication secret environment variables"
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
