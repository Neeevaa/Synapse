"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Clock,
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  Check,
  Crown,
  Shield,
  X,
  FileCode,
  Calendar,
  Layers,
  Info,
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
  transcript?: string | null;
  recording_url_or_reference?: string | null;
  participants: Participant[];
  agenda_items: AgendaItem[];
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  company_role?: string | null;
}

interface ProjectMember {
  id: string;
  user_id: string;
  user_name?: string;
  role: string;
  specialization?: string | null;
}

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const meetingId = params.meetingId as string;

  // Data states
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [project, setProject] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real Local Media State (Current User Only)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  // Simulated peer AV states (keyed by user_id for prototype variance)
  const [peerStates, setPeerStates] = useState<Record<string, { isMuted: boolean; isVideoOff: boolean }>>({});

  // Elapsed timer state (in seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // UI Modals / Drawers
  const [showEndConfirmModal, setShowEndConfirmModal] = useState<boolean>(false);
  const [showIntelligenceModal, setShowIntelligenceModal] = useState<boolean>(false);
  const [showSidePanel, setShowSidePanel] = useState<boolean>(false);
  const [sidePanelTab, setSidePanelTab] = useState<"participants" | "agenda">("participants");
  const [endingMeeting, setEndingMeeting] = useState<boolean>(false);

  // Meeting Intelligence Form State
  const [intelligenceMode, setIntelligenceMode] = useState<"paste" | "upload">("paste");
  const [pastedTranscript, setPastedTranscript] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [savingTranscript, setSavingTranscript] = useState<boolean>(false);
  const [transcriptNotice, setTranscriptNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all context data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meetingRes, userRes, projRes, membersRes] = await Promise.all([
        api.get(`/projects/${projectId}/meetings/${meetingId}`),
        api.get("/auth/me"),
        api.get(`/projects/${projectId}`).catch(() => ({ data: { data: null } })),
        api.get(`/projects/${projectId}/members`).catch(() => ({ data: { data: [] } })),
      ]);

      const mData: MeetingDetail = meetingRes.data.data;
      setMeeting(mData);
      setCurrentUser(userRes.data.data);
      if (projRes.data.data) setProject(projRes.data.data);

      const memList = membersRes.data.data?.members || membersRes.data.data || [];
      setProjectMembers(
        memList.map((m: any) => ({
          id: m.id,
          user_id: m.user_id || m.user?.id,
          user_name: m.user_name || `${m.user?.first_name || ""} ${m.user?.last_name || ""}`.trim() || m.user?.email || "Member",
          role: m.role,
          specialization: m.specialization,
        }))
      );

      // If meeting is already COMPLETED, open Intelligence screen directly
      if (mData.status === "COMPLETED") {
        setShowIntelligenceModal(true);
        if (mData.transcript) {
          setPastedTranscript(mData.transcript);
        }
      }

      // Initialize prototype peer AV states deterministically
      const initPeers: Record<string, { isMuted: boolean; isVideoOff: boolean }> = {};
      mData.participants.forEach((p, index) => {
        // Some participants muted/unmuted for visual realism in prototype
        initPeers[p.user_id] = {
          isMuted: index % 3 === 1,
          isVideoOff: index % 4 === 2,
        };
      });
      setPeerStates(initPeers);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to enter meeting room.");
    } finally {
      setLoading(false);
    }
  }, [projectId, meetingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live timer tick
  useEffect(() => {
    if (meeting?.status === "COMPLETED") return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting?.status]);

  // Format timer
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remainMins = mins % 60;
      return `${hrs.toString().padStart(2, "0")}:${remainMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine host authorization
  // Reuses existing authorization model:
  // - meeting organizer
  // - project manager on this project
  // - company OWNER or ADMIN
  const currentMember = projectMembers.find((m) => m.user_id === currentUser?.id);
  const isHost = meeting && currentUser ? meeting.organizer_id === currentUser.id : false;
  const isProjectManager = currentMember?.role === "PROJECT_MANAGER";
  const isCompanyAdmin =
    currentUser?.role === "OWNER" ||
    currentUser?.role === "ADMIN" ||
    currentUser?.company_role === "OWNER" ||
    currentUser?.company_role === "ADMIN";

  const canEndMeeting = isHost || isProjectManager || isCompanyAdmin;

  // Keep stream refs synchronized for unmount cleanup
  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    microphoneStreamRef.current = microphoneStream;
  }, [microphoneStream]);

  // Clean error auto-dismiss
  useEffect(() => {
    if (deviceError) {
      const timer = setTimeout(() => setDeviceError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [deviceError]);

  // Stop all media tracks helper
  const stopAllMedia = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    }
    setCameraStream(null);
    setMicrophoneStream(null);
    setCameraEnabled(false);
    setMicrophoneEnabled(false);
    setIsVideoOff(true);
    setIsMuted(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      microphoneStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Toggle Camera Handler (Current User Only)
  const toggleCamera = async () => {
    setDeviceError(null);
    if (cameraEnabled && cameraStream) {
      // Turn camera OFF
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraEnabled(false);
      setIsVideoOff(true);
      return;
    }

    // Turn camera ON
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setDeviceError("Camera access is not supported by your browser or the connection is not secure. Please ensure you are connected via HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(true);
      setIsVideoOff(false);
    } catch (err: any) {
      setIsVideoOff(true);
      setCameraEnabled(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setDeviceError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setDeviceError("No camera found. Please connect a webcam and try again.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setDeviceError("Camera is currently in use by another application.");
      } else {
        setDeviceError(err.message || "Failed to access camera.");
      }
    }
  };

  // Toggle Microphone Handler (Current User Only)
  const toggleMicrophone = async () => {
    setDeviceError(null);
    if (microphoneEnabled && microphoneStream) {
      // MUTE
      microphoneStream.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
      setMicrophoneStream(null);
      setMicrophoneEnabled(false);
      setIsMuted(true);
      return;
    }

    // UNMUTE
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setDeviceError("Microphone access is not supported by your browser or the connection is not secure. Please ensure you are connected via HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      setMicrophoneStream(stream);
      setMicrophoneEnabled(true);
      setIsMuted(false);
    } catch (err: any) {
      setIsMuted(true);
      setMicrophoneEnabled(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setDeviceError("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setDeviceError("No microphone found. Please connect an audio input device.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setDeviceError("Microphone is currently in use by another application.");
      } else {
        setDeviceError(err.message || "Failed to access microphone.");
      }
    }
  };

  // Leave Meeting action (stops all media tracks and returns to meeting details)
  const handleLeaveMeeting = () => {
    stopAllMedia();
    router.push(`/projects/${projectId}/meetings/${meetingId}`);
  };

  // End Meeting action (Host / PM completes the meeting)
  const handleConfirmEndMeeting = async () => {
    stopAllMedia();
    setEndingMeeting(true);
    try {
      // Transition meeting status to COMPLETED using existing PATCH endpoint
      const res = await api.patch(`/projects/${projectId}/meetings/${meetingId}`, {
        status: "COMPLETED",
      });
      setMeeting(res.data.data);
      setShowEndConfirmModal(false);
      // Transition immediately to Meeting Intelligence workflow
      setShowIntelligenceModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to end meeting.");
    } finally {
      setEndingMeeting(false);
    }
  };

  // Handle client-side file upload for transcript
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check supported file extensions: .txt, .vtt, .srt, .md, .json
    const lowerName = file.name.toLowerCase();
    const validExtensions = [".txt", ".vtt", ".srt", ".md", ".json"];
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setTranscriptNotice("Please select a valid transcript file (.txt, .vtt, .srt, .md, .json).");
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPastedTranscript(content || "");
      setTranscriptNotice(`Loaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.onerror = () => {
      setTranscriptNotice("Failed to read file content.");
    };
    reader.readAsText(file);
  };

  // Save Transcript & Finish Workflow
  const handleSaveTranscript = async () => {
    if (!pastedTranscript.trim()) {
      setTranscriptNotice("Please paste or upload transcript content first.");
      return;
    }

    setSavingTranscript(true);
    setTranscriptNotice(null);
    try {
      await api.put(`/projects/${projectId}/meetings/${meetingId}/transcript`, {
        transcript: pastedTranscript.trim(),
        recording_url_or_reference: meeting?.recording_url_or_reference || null,
      });
      // Return to meeting details view with transcript populated
      router.push(`/projects/${projectId}/meetings/${meetingId}`);
    } catch (err: any) {
      setTranscriptNotice(err.response?.data?.message || "Failed to save transcript.");
      setSavingTranscript(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 animate-spin text-cyan-500" />
        <p className="text-sm text-slate-400 font-medium">Entering Synapse Meeting Room...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <AlertCircle className="size-12 text-rose-500" />
        <h2 className="text-lg font-bold text-white">Cannot Load Meeting Room</h2>
        <p className="text-xs text-slate-400 text-center max-w-md">{error || "Meeting not found."}</p>
        <Link
          href={`/projects/${projectId}/meetings`}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          <ArrowLeft className="size-4" /> Back to Meetings
        </Link>
      </div>
    );
  }

  // Combine participants list ensuring current user is present
  const allParticipantTiles = [...meeting.participants];
  if (currentUser && !allParticipantTiles.some((p) => p.user_id === currentUser.id)) {
    allParticipantTiles.unshift({
      id: "self-temp",
      meeting_id: meeting.id,
      user_id: currentUser.id,
      user_name: `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.email,
      user_email: currentUser.email,
      attendance_status: "ATTENDED",
    });
  }

  // Helper to get initials
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  };

  // Helper to get role label
  const getParticipantRole = (userId: string) => {
    if (userId === meeting.organizer_id) return "Host";
    const mem = projectMembers.find((m) => m.user_id === userId);
    if (!mem) return "Participant";
    if (mem.role === "PROJECT_MANAGER") return "Project Manager";
    if (mem.role === "TEAM_LEAD") return "Team Lead";
    if (mem.role === "DEVELOPER") return "Developer";
    if (mem.role === "VIEWER") return "Viewer";
    return mem.role;
  };

  // Dynamic grid column class based on tile count
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1 max-w-3xl";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-5xl";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2 max-w-5xl";
    if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* TOP BAR / HEADER */}
      <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}/meetings/${meetingId}`}
            title="Back to Meeting Details"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline font-medium">Details</span>
          </Link>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {meeting.title}
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {meeting.meeting_type.replace("_", " ")}
                </span>
              </div>
              {project && (
                <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                  Project: <span className="text-slate-300 font-medium">{project.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* STATUS & CLOCK */}
        <div className="flex items-center gap-3">
          {/* LIVE BADGE */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE</span>
          </div>

          {/* ELAPSED TIMER */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold tracking-wider">
            <Clock className="size-3.5 text-cyan-400" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* SIDE PANEL TOGGLE */}
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              showSidePanel
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Users className="size-3.5" />
            <span className="font-mono">{allParticipantTiles.length}</span>
          </button>
        </div>
      </header>

      {/* DEVICE ERROR ALERT BANNER */}
      {deviceError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-xl border border-rose-800/80 bg-rose-950/95 backdrop-blur-md p-3.5 shadow-2xl flex items-center justify-between gap-3 text-rose-200 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="size-4 text-rose-400 shrink-0" />
              <span className="leading-snug">{deviceError}</span>
            </div>
            <button
              onClick={() => setDeviceError(null)}
              className="text-rose-400 hover:text-white p-1 rounded hover:bg-rose-900/60 cursor-pointer shrink-0"
              title="Dismiss error"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN MEETING ROOM CANVAS */}
      <main className="flex-1 relative flex overflow-hidden p-4 md:p-6 lg:p-8 items-center justify-center">
        {/* PARTICIPANTS GRID */}
        <div
          className={`w-full h-full flex items-center justify-center transition-all duration-300 ${
            showSidePanel ? "mr-80" : ""
          }`}
        >
          <div className={`grid gap-4 w-full mx-auto auto-rows-fr ${getGridClass(allParticipantTiles.length)}`}>
            {allParticipantTiles.map((participant) => {
              const isSelf = participant.user_id === currentUser?.id;
              const isOrganizer = participant.user_id === meeting.organizer_id;
              const roleLabel = getParticipantRole(participant.user_id);

              // State resolution: self uses local state, peers use simulated state
              const participantMuted = isSelf ? isMuted : peerStates[participant.user_id]?.isMuted ?? false;
              const participantVideoOff = isSelf ? isVideoOff : peerStates[participant.user_id]?.isVideoOff ?? false;

              return (
                <div
                  key={participant.id || participant.user_id}
                  className="group relative aspect-video min-h-[180px] sm:min-h-[220px] md:min-h-[250px] rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex items-center justify-center transition-all duration-200 hover:border-slate-700"
                >
                  {/* VIDEO ON (REAL WEBCAM FOR CURRENT USER, SIMULATED AMBIENT CANVAS FOR PEERS) */}
                  {!participantVideoOff ? (
                    isSelf && cameraStream ? (
                      <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                        <video
                          ref={(el) => {
                            if (el && el.srcObject !== cameraStream) {
                              el.srcObject = cameraStream;
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
                        {/* Subtle ambient decorative backdrop representing prototype video stream */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />
                        <div className="relative flex flex-col items-center justify-center space-y-3">
                          <div
                            className={`size-20 md:size-24 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold transition-transform duration-300 border-2 ${
                              isSelf
                                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-cyan-950/50 shadow-lg"
                                : "bg-slate-800/80 border-slate-700 text-slate-300"
                            } ${!participantMuted ? "scale-105 ring-4 ring-emerald-500/20" : ""}`}
                          >
                            {getInitials(participant.user_name, participant.user_email)}
                          </div>
                          {/* Audio activity visualizer pulse when unmuted */}
                          {!participantMuted && (
                            <div className="flex items-center gap-1">
                              <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse delay-75" />
                              <span className="size-1 rounded-full bg-emerald-400 animate-pulse delay-150" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    /* VIDEO OFF (AVATAR CARD) */
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-950 space-y-3">
                      <div className="size-20 md:size-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xl md:text-2xl font-bold text-slate-400">
                        {getInitials(participant.user_name, participant.user_email)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                        <VideoOff className="size-3 text-slate-400" /> Camera Off
                      </span>
                    </div>
                  )}

                  {/* TOP-RIGHT STATUS BADGES */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    {/* Audio Status */}
                    {participantMuted ? (
                      <span
                        title="Microphone muted"
                        className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-400 shadow-xs"
                      >
                        <MicOff className="size-3.5" />
                      </span>
                    ) : (
                      <span
                        title="Microphone active"
                        className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-emerald-400 shadow-xs"
                      >
                        <Mic className="size-3.5" />
                      </span>
                    )}

                    {/* Video Status */}
                    {participantVideoOff && (
                      <span
                        title="Camera disabled"
                        className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 shadow-xs"
                      >
                        <VideoOff className="size-3.5" />
                      </span>
                    )}
                  </div>

                  {/* BOTTOM-LEFT PARTICIPANT INFO OVERLAY */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-2 max-w-[80%] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 shadow-md">
                      <span className="text-xs font-semibold text-white truncate">
                        {participant.user_name || participant.user_email || "Participant"}
                      </span>

                      {/* Self Badge */}
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                          You
                        </span>
                      )}

                      {/* Host Badge */}
                      {isOrganizer && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          <Crown className="size-2.5" /> Host
                        </span>
                      )}

                      {/* Project Role (if not host) */}
                      {!isOrganizer && roleLabel !== "Participant" && (
                        <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {roleLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLIDE-OUT SIDE PANEL (PARTICIPANTS & AGENDA) */}
        {showSidePanel && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl transition-all">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidePanelTab("participants")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    sidePanelTab === "participants"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Participants ({allParticipantTiles.length})
                </button>
                <button
                  onClick={() => setSidePanelTab("agenda")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    sidePanelTab === "agenda"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Agenda ({meeting.agenda_items?.length || 0})
                </button>
              </div>
              <button
                onClick={() => setShowSidePanel(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sidePanelTab === "participants" ? (
                allParticipantTiles.map((p) => {
                  const isSelf = p.user_id === currentUser?.id;
                  const isOrganizer = p.user_id === meeting.organizer_id;
                  const role = getParticipantRole(p.user_id);
                  const pMuted = isSelf ? isMuted : peerStates[p.user_id]?.isMuted ?? false;

                  return (
                    <div
                      key={p.user_id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(p.user_name, p.user_email)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {p.user_name || p.user_email} {isSelf && "(You)"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            {isOrganizer && <Crown className="size-2.5 text-amber-400 inline" />}
                            {role}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 pl-2">
                        {pMuted ? (
                          <MicOff className="size-3.5 text-rose-400" />
                        ) : (
                          <Mic className="size-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-3">
                  {(!meeting.agenda_items || meeting.agenda_items.length === 0) ? (
                    <p className="text-xs text-slate-500 text-center py-6">No agenda items defined.</p>
                  ) : (
                    meeting.agenda_items.map((ag, idx) => (
                      <div
                        key={ag.id || idx}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-cyan-400 font-bold">Topic {idx + 1}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            {ag.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{ag.title}</h4>
                        {ag.description && <p className="text-[11px] text-slate-400">{ag.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* BOTTOM CONTROL BAR */}
      <footer className="h-20 px-6 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-md flex items-center justify-between z-30 shrink-0">
        {/* Prototype info label */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span className="size-2 rounded-full bg-cyan-400" />
          <span className="font-mono">Synapse In-App Video Prototype</span>
        </div>

        {/* CENTER CONTROLS DOCK */}
        <div className="flex items-center gap-3 mx-auto">
          {/* MUTE / UNMUTE BUTTON (REAL MICROPHONE CONTROL) */}
          <button
            onClick={toggleMicrophone}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md ${
              isMuted
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
            }`}
          >
            {isMuted ? <MicOff className="size-4 text-white" /> : <Mic className="size-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* CAMERA ON / OFF BUTTON (REAL CAMERA CONTROL) */}
          <button
            onClick={toggleCamera}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md ${
              isVideoOff
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="size-4 text-white" /> : <Video className="size-4 text-cyan-400" />}
            <span className="hidden sm:inline">{isVideoOff ? "Start Video" : "Stop Video"}</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* LEAVE MEETING BUTTON (Available to all participants) */}
          <button
            onClick={handleLeaveMeeting}
            title="Leave Meeting Room"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-md hover:text-white"
          >
            <PhoneOff className="size-4 text-slate-400" />
            <span>Leave</span>
          </button>

          {/* END MEETING BUTTON (Host / PM / Admin only) */}
          {canEndMeeting && (
            <button
              onClick={() => setShowEndConfirmModal(true)}
              title="End Meeting for Everyone"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-rose-950/40"
            >
              <PhoneOff className="size-4 text-white" />
              <span className="hidden sm:inline">End Meeting</span>
            </button>
          )}
        </div>

        {/* RIGHT SIDE SPACER / CONTEXT */}
        <div className="hidden lg:flex items-center justify-end text-xs text-slate-400">
          <span className="font-mono text-slate-400">
            Meeting ID: {meeting.id.slice(0, 8)}
          </span>
        </div>
      </footer>

      {/* CONFIRM END MEETING MODAL (Host only) */}
      {showEndConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="size-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <PhoneOff className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">End Meeting for Everyone?</h3>
                <p className="text-xs text-slate-400">This will complete the session for all attendees.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Conclude the live meeting room session. Meeting status will become{" "}
              <strong className="text-purple-400">COMPLETED</strong>, and you will proceed to the{" "}
              <strong className="text-cyan-400">Meeting Intelligence</strong> workflow to add your meeting transcript.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(false)}
                disabled={endingMeeting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndMeeting}
                disabled={endingMeeting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md"
              >
                {endingMeeting ? <Loader2 className="size-3.5 animate-spin" /> : <PhoneOff className="size-3.5" />}
                End Meeting Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-MEETING INTELLIGENCE WORKFLOW MODAL */}
      {showIntelligenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="space-y-2 border-b border-slate-800 pb-5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="size-3.5" /> Meeting Concluded
                </div>
                <button
                  onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}`)}
                  className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer"
                  title="Close to Meeting Details"
                >
                  <X className="size-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Meeting Intelligence
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Meeting concluded. Add the meeting transcript to generate structured project intelligence.
              </p>
            </div>

            {transcriptNotice && (
              <div className="rounded-lg bg-cyan-950/40 border border-cyan-800/60 p-3 text-xs text-cyan-300 flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                <span>{transcriptNotice}</span>
              </div>
            )}

            {/* Input Options: Paste vs Upload Tabs */}
            <div className="flex border-b border-slate-800 gap-6">
              <button
                type="button"
                onClick={() => setIntelligenceMode("paste")}
                className={`pb-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  intelligenceMode === "paste"
                    ? "border-cyan-500 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="size-4" /> Paste Transcript
              </button>
              <button
                type="button"
                onClick={() => setIntelligenceMode("upload")}
                className={`pb-3 text-xs font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  intelligenceMode === "upload"
                    ? "border-cyan-500 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <UploadCloud className="size-4" /> Upload Transcript File
              </button>
            </div>

            {/* TAB CONTENT: PASTE */}
            {intelligenceMode === "paste" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label className="font-medium text-slate-300">Raw Transcript Text</label>
                  <span className="font-mono text-[11px]">{pastedTranscript.length} characters</span>
                </div>
                <textarea
                  rows={9}
                  value={pastedTranscript}
                  onChange={(e) => setPastedTranscript(e.target.value)}
                  placeholder="Paste complete raw speaker transcript here...&#10;&#10;[00:01] Sarah: Welcome everyone to the sprint review.&#10;[00:15] Alex: I've finished the user authentication endpoints.&#10;[00:45] Sarah: Great, let's link that to the auth requirement."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-200 placeholder-slate-600 leading-relaxed focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            {/* TAB CONTENT: UPLOAD */}
            {intelligenceMode === "upload" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.vtt,.srt,.md,.json"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950/60 hover:bg-slate-950 space-y-3"
                >
                  <UploadCloud className="size-10 text-cyan-400 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-white">Click or drag & drop to upload transcript</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Supported prototype formats: <span className="font-mono text-slate-300">.txt, .vtt, .srt, .md, .json</span>
                    </p>
                  </div>
                  {uploadedFileName && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-medium border border-cyan-500/30">
                      <FileCode className="size-3.5" /> {uploadedFileName}
                    </div>
                  )}
                </div>

                {pastedTranscript && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-400">Extracted Transcript Preview:</p>
                    <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-slate-300 leading-relaxed">
                      {pastedTranscript.slice(0, 400)}...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}`)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-center"
              >
                Skip to Meeting Details
              </button>

              <button
                type="button"
                onClick={handleSaveTranscript}
                disabled={savingTranscript || !pastedTranscript.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors cursor-pointer shadow-md"
              >
                {savingTranscript ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Save Transcript & Open Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
