"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import Image from "next/image";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  Shield,
  Layers,
  Info,
  Key,
  Eye,
  EyeOff,
  Unplug,
  CheckCircle,
  Sparkles,
} from "lucide-react";

interface ProjectDetail {
  id: string;
  name: string;
  description?: string | null;
  company_id: string;
}

interface ProjectMemberItem {
  id: string;
  user_id: string;
  role: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_id: string;
}

interface ProjectGitRepository {
  id: string;
  project_id: string;
  repository_url: string;
  repository_name?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

interface GitHubConnectionData {
  connected: boolean;
  connection: {
    id: string;
    project_id: string;
    github_username: string;
    github_user_id?: string | null;
    github_avatar_url?: string | null;
    token_type: string;
    is_valid: boolean;
    last_tested_at?: string | null;
    connected_at: string;
  } | null;
}

interface GitHubCommitItem {
  sha: string;
  short_sha: string;
  message: string;
  author_name?: string | null;
  author_avatar?: string | null;
  date?: string | null;
  html_url: string;
}

interface GitHubPullRequestItem {
  number: number;
  title: string;
  state: string;
  author_login?: string | null;
  author_avatar?: string | null;
  created_at?: string | null;
  html_url: string;
}

interface TaskGitReference {
  id: string;
  project_id: string;
  task_id: string;
  task_title: string;
  task_status?: string | null;
  task_priority?: string | null;
  reference_type: "COMMIT" | "PULL_REQUEST";
  commit_hash?: string | null;
  commit_url?: string | null;
  pull_request_url?: string | null;
  description?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
}

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/;
const GITHUB_COMMIT_URL_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/commit\/([0-9a-fA-F]{7,64})\/?$/;
const GITHUB_PR_URL_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/([0-9]+)\/?$/;
const COMMIT_HASH_REGEX = /^[0-9a-fA-F]{7,64}$/;

export default function GitCollaborationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  // Core Data
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [repository, setRepository] = useState<ProjectGitRepository | null>(null);
  const [gitConnection, setGitConnection] = useState<GitHubConnectionData | null>(null);
  const [references, setReferences] = useState<TaskGitReference[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Filters
  const [taskFilter, setTaskFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "COMMIT" | "PULL_REQUEST">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Repository Modal State
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [repoNameInput, setRepoNameInput] = useState("");
  const [repoSubmitting, setRepoSubmitting] = useState(false);
  const [repoModalError, setRepoModalError] = useState<string | null>(null);

  // Remove Repository Modal
  const [removeRepoModalOpen, setRemoveRepoModalOpen] = useState(false);
  const [removingRepo, setRemovingRepo] = useState(false);

  // GitHub PAT Connection Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [patInput, setPatInput] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [connectingPat, setConnectingPat] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // Test Connection State
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Disconnect Modal State
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Live Commits / PRs Browser Modals
  const [commitsModalOpen, setCommitsModalOpen] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [githubCommits, setGithubCommits] = useState<GitHubCommitItem[]>([]);
  const [commitsError, setCommitsError] = useState<string | null>(null);

  const [prsModalOpen, setPrsModalOpen] = useState(false);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [githubPrs, setGithubPrs] = useState<GitHubPullRequestItem[]>([]);
  const [prsError, setPrsError] = useState<string | null>(null);

  // Add Reference Form State
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [refType, setRefType] = useState<"COMMIT" | "PULL_REQUEST">("COMMIT");
  const [commitHashInput, setCommitHashInput] = useState<string>("");
  const [commitUrlInput, setCommitUrlInput] = useState<string>("");
  const [prUrlInput, setPrUrlInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [addingRef, setAddingRef] = useState(false);
  const [addRefError, setAddRefError] = useState<string | null>(null);
  const [addRefSuccess, setAddRefSuccess] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Edit Reference Modal State
  const [editRefModalOpen, setEditRefModalOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<TaskGitReference | null>(null);
  const [editCommitHash, setEditCommitHash] = useState("");
  const [editCommitUrl, setEditCommitUrl] = useState("");
  const [editPrUrl, setEditPrUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingRef, setUpdatingRef] = useState(false);
  const [editRefError, setEditRefError] = useState<string | null>(null);

  // Delete Reference Modal State
  const [deleteRefModalOpen, setDeleteRefModalOpen] = useState(false);
  const [deletingRef, setDeletingRef] = useState<TaskGitReference | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Fetch Current User Profile
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data?.data) {
        setCurrentUserId(res.data.data.id);
        setCurrentUserRole(res.data.data.role);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch Project Details & Data
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      setPageError(null);

      try {
        const [projRes, repoRes, connRes, refsRes, tasksRes, memRes] = await Promise.allSettled([
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/git/repository`),
          api.get(`/projects/${projectId}/git/connection`),
          api.get(`/projects/${projectId}/git/references`),
          api.get(`/projects/${projectId}/tasks`),
          api.get(`/projects/${projectId}/members`),
        ]);

        if (projRes.status === "fulfilled" && projRes.value.data?.data) {
          setProject(projRes.value.data.data);
        } else if (projRes.status === "rejected") {
          setPageError(projRes.reason?.response?.data?.message || "Failed to load project details.");
        }

        if (repoRes.status === "fulfilled") {
          setRepository(repoRes.value.data?.data || null);
        }

        if (connRes.status === "fulfilled") {
          setGitConnection(connRes.value.data?.data || { connected: false, connection: null });
        }

        if (refsRes.status === "fulfilled") {
          setReferences(refsRes.value.data?.data || []);
        }

        if (tasksRes.status === "fulfilled") {
          setTasks(tasksRes.value.data?.data?.tasks || []);
        }

        if (memRes.status === "fulfilled") {
          setMembers(memRes.value.data?.data?.members || []);
        }
      } catch (err: any) {
        setPageError(err.response?.data?.message || "Unexpected error loading Git collaboration data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchCurrentUser();
    fetchData();
  }, [fetchCurrentUser, fetchData]);

  // Permissions Calculation
  const currentUserMember = members.find((m) => m.user_id === currentUserId);
  const isCompanyAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isPMorTL =
    currentUserMember?.role === "PROJECT_MANAGER" || currentUserMember?.role === "TEAM_LEAD";
  const canManageRepo = isCompanyAdmin || isPMorTL;
  const canContribute =
    isCompanyAdmin ||
    isPMorTL ||
    currentUserMember?.role === "DEVELOPER";

  // Copy Hash Helper
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Open Register/Edit Repo Modal
  const openRepoModal = () => {
    setRepoUrlInput(repository?.repository_url || "");
    setRepoNameInput(repository?.repository_name || "");
    setRepoModalError(null);
    setRepoModalOpen(true);
  };

  // Save Repository (Create or Update)
  const handleSaveRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepoModalError(null);

    const cleanUrl = repoUrlInput.trim();
    if (!cleanUrl) {
      setRepoModalError("Repository URL is required.");
      return;
    }

    if (!GITHUB_REPO_REGEX.test(cleanUrl)) {
      setRepoModalError("Please enter a valid HTTPS GitHub repository URL (e.g. https://github.com/owner/repository).");
      return;
    }

    setRepoSubmitting(true);
    try {
      if (repository) {
        const res = await api.patch(`/projects/${projectId}/git/repository`, {
          repository_url: cleanUrl,
          repository_name: repoNameInput.trim() || undefined,
        });
        setRepository(res.data.data);
      } else {
        const res = await api.post(`/projects/${projectId}/git/repository`, {
          repository_url: cleanUrl,
          repository_name: repoNameInput.trim() || undefined,
        });
        setRepository(res.data.data);
      }
      setRepoModalOpen(false);
    } catch (err: any) {
      setRepoModalError(err.response?.data?.message || "Failed to save repository.");
    } finally {
      setRepoSubmitting(false);
    }
  };

  // Remove Repository
  const handleRemoveRepository = async () => {
    setRemovingRepo(true);
    try {
      await api.delete(`/projects/${projectId}/git/repository`);
      setRepository(null);
      setRemoveRepoModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove repository.");
    } finally {
      setRemovingRepo(false);
    }
  };

  // Connect GitHub PAT Submit
  const handleConnectPat = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(null);
    setConnectSuccess(null);

    const token = patInput.trim();
    if (!token) {
      setConnectError("Please enter your Personal Access Token.");
      return;
    }

    setConnectingPat(true);
    try {
      const res = await api.post(`/projects/${projectId}/git/connection`, {
        personal_access_token: token,
      });

      // Clear token immediately from frontend memory
      setPatInput("");
      setGitConnection(res.data.data);
      setConnectSuccess(`Successfully connected as @${res.data.data.connection.github_username}!`);

      setTimeout(() => {
        setConnectModalOpen(false);
        setConnectSuccess(null);
      }, 1500);
    } catch (err: any) {
      setConnectError(err.response?.data?.message || "Failed to connect token. Please verify permissions.");
    } finally {
      setConnectingPat(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.post(`/projects/${projectId}/git/connection/test`);
      setTestResult({
        success: true,
        message: res.data.message || "GitHub connection is active and verified.",
      });
      fetchData(true);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || "Connection check failed. Token may be revoked or expired.",
      });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  // Disconnect PAT
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.delete(`/projects/${projectId}/git/connection`);
      setGitConnection({ connected: false, connection: null });
      setDisconnectModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  };

  // Open Live Commits Modal
  const openCommitsBrowser = async () => {
    setCommitsModalOpen(true);
    setLoadingCommits(true);
    setCommitsError(null);
    try {
      const res = await api.get(`/projects/${projectId}/git/github/commits`);
      setGithubCommits(res.data.data || []);
    } catch (err: any) {
      setCommitsError(err.response?.data?.message || "Failed to fetch live commits from GitHub.");
    } finally {
      setLoadingCommits(false);
    }
  };

  // Open Live PRs Modal
  const openPrsBrowser = async () => {
    setPrsModalOpen(true);
    setLoadingPrs(true);
    setPrsError(null);
    try {
      const res = await api.get(`/projects/${projectId}/git/github/pulls`);
      setGithubPrs(res.data.data || []);
    } catch (err: any) {
      setPrsError(err.response?.data?.message || "Failed to fetch live pull requests from GitHub.");
    } finally {
      setLoadingPrs(false);
    }
  };

  // Populate Add Reference form from Live GitHub Commit
  const selectLiveCommitForTask = (commit: GitHubCommitItem) => {
    setRefType("COMMIT");
    setCommitHashInput(commit.sha);
    setCommitUrlInput(commit.html_url);
    setDescriptionInput(commit.message);
    setCommitsModalOpen(false);
    // Smooth scroll down to add ref form
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  // Populate Add Reference form from Live GitHub PR
  const selectLivePrForTask = (pr: GitHubPullRequestItem) => {
    setRefType("PULL_REQUEST");
    setPrUrlInput(pr.html_url);
    setDescriptionInput(`PR #${pr.number}: ${pr.title}`);
    setPrsModalOpen(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  // Add Git Reference Submit
  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddRefError(null);
    setAddRefSuccess(null);

    if (!selectedTaskId) {
      setAddRefError("Please select a task from this project.");
      return;
    }

    if (refType === "COMMIT") {
      const cleanHash = commitHashInput.trim();
      if (!cleanHash) {
        setAddRefError("Commit hash is required for Commit references.");
        return;
      }
      if (!COMMIT_HASH_REGEX.test(cleanHash)) {
        setAddRefError("Commit hash must be a hexadecimal string between 7 and 64 characters.");
        return;
      }

      const cleanCommitUrl = commitUrlInput.trim();
      if (cleanCommitUrl && !GITHUB_COMMIT_URL_REGEX.test(cleanCommitUrl)) {
        setAddRefError("Commit URL must be a valid HTTPS GitHub commit URL.");
        return;
      }
    } else {
      const cleanPrUrl = prUrlInput.trim();
      if (!cleanPrUrl) {
        setAddRefError("Pull request URL is required for Pull Request references.");
        return;
      }
      if (!GITHUB_PR_URL_REGEX.test(cleanPrUrl)) {
        setAddRefError("Pull request URL must be a valid HTTPS GitHub pull request URL.");
        return;
      }
    }

    setAddingRef(true);
    try {
      const payload: any = {
        task_id: selectedTaskId,
        reference_type: refType,
        description: descriptionInput.trim() || undefined,
      };

      if (refType === "COMMIT") {
        payload.commit_hash = commitHashInput.trim();
        if (commitUrlInput.trim()) payload.commit_url = commitUrlInput.trim();
      } else {
        payload.pull_request_url = prUrlInput.trim();
      }

      const res = await api.post(`/projects/${projectId}/git/references`, payload);
      const newRef: TaskGitReference = res.data.data;

      setReferences((prev) => [newRef, ...prev]);
      setAddRefSuccess(`Successfully linked ${refType === "COMMIT" ? "commit" : "pull request"} to task!`);

      // Reset form fields
      setCommitHashInput("");
      setCommitUrlInput("");
      setPrUrlInput("");
      setDescriptionInput("");
      setTimeout(() => setAddRefSuccess(null), 3500);
    } catch (err: any) {
      setAddRefError(err.response?.data?.message || "Failed to create Git reference.");
    } finally {
      setAddingRef(false);
    }
  };

  // Open Edit Reference Modal
  const openEditRefModal = (ref: TaskGitReference) => {
    setEditingRef(ref);
    setEditCommitHash(ref.commit_hash || "");
    setEditCommitUrl(ref.commit_url || "");
    setEditPrUrl(ref.pull_request_url || "");
    setEditDescription(ref.description || "");
    setEditRefError(null);
    setEditRefModalOpen(true);
  };

  // Save Edit Reference
  const handleUpdateReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRef) return;
    setEditRefError(null);

    const payload: any = {
      description: editDescription.trim() || undefined,
    };

    if (editingRef.reference_type === "COMMIT") {
      const cleanHash = editCommitHash.trim();
      if (!cleanHash) {
        setEditRefError("Commit hash is required.");
        return;
      }
      if (!COMMIT_HASH_REGEX.test(cleanHash)) {
        setEditRefError("Commit hash must be a hexadecimal string (7 to 64 chars).");
        return;
      }
      payload.commit_hash = cleanHash;

      const cleanUrl = editCommitUrl.trim();
      if (cleanUrl) {
        if (!GITHUB_COMMIT_URL_REGEX.test(cleanUrl)) {
          setEditRefError("Invalid GitHub commit URL.");
          return;
        }
        payload.commit_url = cleanUrl;
      } else {
        payload.commit_url = null;
      }
    } else {
      const cleanPr = editPrUrl.trim();
      if (!cleanPr) {
        setEditRefError("Pull request URL is required.");
        return;
      }
      if (!GITHUB_PR_URL_REGEX.test(cleanPr)) {
        setEditRefError("Invalid GitHub pull request URL.");
        return;
      }
      payload.pull_request_url = cleanPr;
    }

    setUpdatingRef(true);
    try {
      const res = await api.patch(
        `/projects/${projectId}/git/references/${editingRef.id}`,
        payload
      );
      const updated: TaskGitReference = res.data.data;
      setReferences((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditRefModalOpen(false);
    } catch (err: any) {
      setEditRefError(err.response?.data?.message || "Failed to update Git reference.");
    } finally {
      setUpdatingRef(false);
    }
  };

  // Delete Reference
  const handleDeleteReference = async () => {
    if (!deletingRef) return;
    setConfirmingDelete(true);
    try {
      await api.delete(`/projects/${projectId}/git/references/${deletingRef.id}`);
      setReferences((prev) => prev.filter((r) => r.id !== deletingRef.id));
      setDeleteRefModalOpen(false);
      setDeletingRef(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete reference.");
    } finally {
      setConfirmingDelete(false);
    }
  };

  // Filtered References
  const filteredReferences = references.filter((ref) => {
    if (taskFilter !== "ALL" && ref.task_id !== taskFilter) return false;
    if (typeFilter !== "ALL" && ref.reference_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ref.task_title?.toLowerCase().includes(q);
      const matchHash = ref.commit_hash?.toLowerCase().includes(q);
      const matchDesc = ref.description?.toLowerCase().includes(q);
      const matchUrl = (ref.commit_url || ref.pull_request_url || "").toLowerCase().includes(q);
      if (!matchTitle && !matchHash && !matchDesc && !matchUrl) return false;
    }
    return true;
  });

  const isConnected = gitConnection?.connected && gitConnection.connection;

  return (
    <ProtectedShell pageTitle={`${project?.name || "Project"} · Git Collaboration`}>
      <div className="h-full flex flex-col overflow-y-auto bg-background">
        {/* Top Header / Breadcrumbs */}
        <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>{project?.name || "Project"}</span>
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <GitBranch className="size-3.5" />
              </div>
              <h1 className="text-sm font-semibold text-foreground">Git Collaboration</h1>
            </div>

            {isConnected && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hidden md:inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" /> GitHub Connected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Git references"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Global Loading / Error State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="size-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading Git collaboration workspace...</p>
          </div>
        ) : pageError ? (
          <div className="m-6 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to load Git collaboration</p>
              <p className="text-xs mt-1 text-destructive/90">{pageError}</p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
            {/* Feedback alert for testing connection */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
                <button onClick={() => setTestResult(null)} className="opacity-70 hover:opacity-100">
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* SECTION 0: SECURE GITHUB CONNECTION CARD */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Key className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">GitHub Integration</h2>
                      {isConnected ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Connected
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Connect your GitHub account to browse commits, pull requests, and link them directly to project tasks.
                    </p>
                  </div>
                </div>

                {canManageRepo && (
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {testingConnection ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 text-emerald-500" />}
                          Test Connection
                        </button>
                        <button
                          onClick={() => setDisconnectModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                        >
                          <Unplug className="size-3.5" /> Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setConnectError(null);
                          setConnectSuccess(null);
                          setPatInput("");
                          setConnectModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Key className="size-3.5" /> Connect GitHub
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isConnected && gitConnection?.connection ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-background/80 border border-border/80">
                  <div className="flex items-center gap-3 min-w-0">
                    {gitConnection.connection.github_avatar_url ? (
                      <img
                        src={gitConnection.connection.github_avatar_url}
                        alt={gitConnection.connection.github_username}
                        className="size-9 rounded-full border border-border shrink-0 object-cover"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                        {gitConnection.connection.github_username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          @{gitConnection.connection.github_username}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-muted text-muted-foreground uppercase">
                          {gitConnection.connection.token_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Active Connection
                        </span>
                        {gitConnection.connection.last_tested_at && (
                          <>
                            <span>•</span>
                            <span>Verified: {new Date(gitConnection.connection.last_tested_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions to live-browse GitHub */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={openCommitsBrowser}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer"
                    >
                      <GitCommit className="size-3.5" /> Live Commits
                    </button>
                    <button
                      onClick={openPrsBrowser}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      <GitPullRequest className="size-3.5" /> Live PRs
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <Shield className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Connect your GitHub account to browse commits, pull requests, and link items directly into Synapse tasks. Your credentials are securely encrypted and kept private.
                    </span>
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 1: REPOSITORY DETAILS */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center text-foreground">
                    <svg className="size-5 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Registered GitHub Repository</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The primary repository associated with this Synapse project.
                    </p>
                  </div>
                </div>

                {canManageRepo && (
                  <div className="flex items-center gap-2">
                    {repository ? (
                      <>
                        <button
                          onClick={openRepoModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="size-3.5" /> Edit URL
                        </button>
                        <button
                          onClick={() => setRemoveRepoModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/20 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={openRepoModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="size-3.5" /> Register Repository
                      </button>
                    )}
                  </div>
                )}
              </div>

              {repository ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-background/80 border border-border/80">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">
                        {repository.repository_name || repository.repository_url.replace("https://github.com/", "")}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Active Primary
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-muted-foreground truncate max-w-md" title={repository.repository_url}>
                        {repository.repository_url}
                      </span>
                    </div>
                  </div>

                  <a
                    href={repository.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity shrink-0 w-fit"
                  >
                    Open in GitHub <ExternalLink className="size-3" />
                  </a>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center space-y-2">
                  <GitBranch className="size-8 text-muted-foreground/60 mb-1" />
                  <p className="text-sm font-semibold text-foreground">No GitHub repository registered yet</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Registering a repository establishes the default GitHub workspace URL for your project tasks and pull requests.
                  </p>
                  {canManageRepo && (
                    <button
                      onClick={openRepoModal}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
                    >
                      <Plus className="size-3.5" /> Connect GitHub Repository
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* SECTION 2: LINKED COMMITS & PULL REQUESTS */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-foreground">Linked Commits & Pull Requests</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Commits and pull requests linked to project tasks. ({references.length} linked)
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[180px]">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search linked items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Tasks</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title.length > 30 ? `${t.title.substring(0, 30)}...` : t.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">All Types</option>
                    <option value="COMMIT">Commits</option>
                    <option value="PULL_REQUEST">Pull Requests</option>
                  </select>
                </div>
              </div>

              {filteredReferences.length === 0 ? (
                <div className="p-10 text-center rounded-xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center space-y-2">
                  <GitCommit className="size-8 text-muted-foreground/60 mb-1" />
                  <p className="text-sm font-semibold text-foreground">No linked commits or pull requests found</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    {references.length === 0
                      ? isConnected
                        ? "No commits or pull requests have been linked to tasks yet. Browse Live Commits or Live PRs above to link your work."
                        : "No commits or pull requests have been linked to tasks yet. Connect GitHub or add a reference below to get started."
                      : "Try clearing your search query or dropdown filters to view existing references."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredReferences.map((ref) => {
                    const isCommit = ref.reference_type === "COMMIT";
                    const shortHash = ref.commit_hash ? ref.commit_hash.substring(0, 8) : "";
                    const isCreator = currentUserId && ref.created_by === currentUserId;
                    const canEditThisRef = isCompanyAdmin || isPMorTL || isCreator;

                    return (
                      <div
                        key={ref.id}
                        className="p-4 rounded-xl border border-border/80 bg-background/60 hover:bg-background transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isCommit ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                <GitCommit className="size-3" /> Commit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <GitPullRequest className="size-3" /> Pull Request
                              </span>
                            )}

                            <Link
                              href={`/projects/${projectId}/board`}
                              className="text-xs font-bold text-foreground hover:text-primary transition-colors hover:underline truncate max-w-sm"
                              title={`Task: ${ref.task_title}`}
                            >
                              {ref.task_title}
                            </Link>

                            {ref.task_status && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                {ref.task_status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {isCommit ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted/80 text-foreground border border-border/50">
                                  {shortHash}
                                </span>
                                <button
                                  onClick={() => ref.commit_hash && handleCopyHash(ref.commit_hash)}
                                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                  title="Copy full commit hash"
                                >
                                  {copiedHash === ref.commit_hash ? (
                                    <Check className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                                {ref.commit_url && (
                                  <a
                                    href={ref.commit_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline ml-1"
                                    title={ref.commit_url}
                                  >
                                    View Commit <ExternalLink className="size-2.5" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              ref.pull_request_url && (
                                <a
                                  href={ref.pull_request_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                                  title={ref.pull_request_url}
                                >
                                  {ref.pull_request_url.replace("https://github.com/", "")}
                                  <ExternalLink className="size-2.5" />
                                </a>
                              )
                            )}

                            {ref.description && (
                              <span className="text-muted-foreground before:content-['•'] before:mr-2">
                                {ref.description}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-muted-foreground/80 flex items-center gap-2">
                            <span>Added by {ref.creator_name || "Team Member"}</span>
                            <span>•</span>
                            <span>{new Date(ref.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {canEditThisRef && (
                          <div className="flex items-center gap-1 shrink-0 self-start md:self-center">
                            <button
                              onClick={() => openEditRefModal(ref)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                              title="Edit reference"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingRef(ref);
                                setDeleteRefModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Delete reference"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 3: ADD REFERENCE TO TASK */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <h2 className="text-base font-bold text-foreground">Add Reference to Task</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isConnected
                      ? "Browse live GitHub commits and pull requests, or enter a reference manually."
                      : "Associate a project task with a Git commit hash or pull request URL."}
                  </p>
                </div>

                {isConnected && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openCommitsBrowser}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-semibold hover:bg-purple-500/20 transition-colors cursor-pointer"
                    >
                      <Sparkles className="size-3" /> Select Live Commit
                    </button>
                    <button
                      type="button"
                      onClick={openPrsBrowser}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      <Sparkles className="size-3" /> Select Live PR
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualForm(!showManualForm)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showManualForm ? "Hide Manual Form" : "Manual Entry (Optional)"}
                    </button>
                  </div>
                )}
              </div>

              {!canContribute ? (
                <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
                  You need developer or management permissions in this project to link Git references.
                </div>
              ) : isConnected && !showManualForm ? (
                <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>
                      GitHub is connected. Click <strong>Select Live Commit</strong> or <strong>Select Live PR</strong> above to link work directly to tasks in 1 click.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer shrink-0"
                  >
                    Enter manually instead
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddReference} className="space-y-4">
                  {addRefError && (
                    <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{addRefError}</span>
                    </div>
                  )}

                  {addRefSuccess && (
                    <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{addRefSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Select Task <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        required
                      >
                        <option value="">-- Choose a task belonging to this project --</option>
                        {tasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title} ({task.status})
                          </option>
                        ))}
                      </select>
                      {tasks.length === 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          No tasks found. Create a task on the Sprint Board or Backlog first.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Reference Type <span className="text-destructive">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRefType("COMMIT")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            refType === "COMMIT"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-accent/50"
                          }`}
                        >
                          <GitCommit className="size-3.5" /> Commit
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefType("PULL_REQUEST")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            refType === "PULL_REQUEST"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-accent/50"
                          }`}
                        >
                          <GitPullRequest className="size-3.5" /> Pull Request
                        </button>
                      </div>
                    </div>
                  </div>

                  {refType === "COMMIT" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-background/50 border border-border/60">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Commit Hash <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 7b8c9d0e1f2a3456"
                          value={commitHashInput}
                          onChange={(e) => setCommitHashInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                          required
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Hexadecimal commit hash (7 to 64 characters).
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Commit URL <span className="text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <input
                          type="url"
                          placeholder="https://github.com/owner/repository/commit/..."
                          value={commitUrlInput}
                          onChange={(e) => setCommitUrlInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-background/50 border border-border/60">
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Pull Request URL <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/owner/repository/pull/42"
                        value={prUrlInput}
                        onChange={(e) => setPrUrlInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Description / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Implemented JWT token refresh flow"
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      maxLength={500}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={addingRef}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {addingRef ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      Link Reference
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}

        {/* MODAL: CONNECT GITHUB PAT */}
        {connectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Key className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Connect GitHub Token</h3>
                </div>
                <button
                  onClick={() => setConnectModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Instructions Banner */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-2 leading-relaxed">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="size-3.5 text-primary" /> Recommended Permissions (Fine-grained Token):
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>In GitHub, create a <strong>Fine-grained personal access token</strong>.</li>
                  <li>Select your project&apos;s repository under <strong>Repository access</strong>.</li>
                  <li>Grant <strong>Repository permissions</strong>: <code>Contents: Read-only</code> and <code>Pull requests: Read-only</code>.</li>
                </ul>
                <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50">
                  🔒 <strong>Security & Privacy:</strong> Your token is securely encrypted and only used to interact with authorized GitHub repositories.
                </p>
              </div>

              {connectError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}

              {connectSuccess && (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{connectSuccess}</span>
                </div>
              )}

              <form onSubmit={handleConnectPat} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Personal Access Token <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPat ? "text" : "password"}
                      placeholder="github_pat_..."
                      value={patInput}
                      onChange={(e) => setPatInput(e.target.value)}
                      required
                      autoComplete="off"
                      className="w-full pl-3 pr-10 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPat(!showPat)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPat ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setConnectModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connectingPat}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                  >
                    {connectingPat ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Validate & Connect
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DISCONNECT CONFIRMATION */}
        {disconnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Unplug className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Disconnect GitHub Token?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This will remove the stored encrypted token from this project.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg leading-relaxed">
                All saved task commit references and pull request links will <strong className="text-foreground">remain preserved</strong>.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDisconnectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
                >
                  {disconnecting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Disconnect Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: LIVE COMMITS BROWSER */}
        {commitsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <GitCommit className="size-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-bold text-foreground">Live Commits from GitHub</h3>
                </div>
                <button onClick={() => setCommitsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="size-4" />
                </button>
              </div>

              {loadingCommits ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Fetching live commits from GitHub API...</p>
                </div>
              ) : commitsError ? (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs">
                  {commitsError}
                </div>
              ) : (
                <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                  {githubCommits.map((c) => (
                    <div
                      key={c.sha}
                      className="p-3 rounded-xl border border-border/70 bg-background/60 hover:bg-background transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-semibold text-foreground truncate">{c.message}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <span>{c.short_sha}</span>
                          <span>•</span>
                          <span>{c.author_name}</span>
                          {c.date && <span>• {new Date(c.date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => selectLiveCommitForTask(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                      >
                        Link to Task
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: LIVE PRS BROWSER */}
        {prsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-foreground">Live Pull Requests from GitHub</h3>
                </div>
                <button onClick={() => setPrsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="size-4" />
                </button>
              </div>

              {loadingPrs ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Fetching pull requests from GitHub API...</p>
                </div>
              ) : prsError ? (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs">
                  {prsError}
                </div>
              ) : (
                <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                  {githubPrs.map((pr) => (
                    <div
                      key={pr.number}
                      className="p-3 rounded-xl border border-border/70 bg-background/60 hover:bg-background transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">#{pr.number}</span>
                          <p className="font-semibold text-foreground truncate">{pr.title}</p>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          State: <span className="uppercase font-semibold">{pr.state}</span> by @{pr.author_login}
                        </div>
                      </div>
                      <button
                        onClick={() => selectLivePrForTask(pr)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-colors shrink-0"
                      >
                        Link to Task
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: REGISTER / EDIT REPOSITORY */}
        {repoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <GitBranch className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    {repository ? "Edit Repository URL" : "Register GitHub Repository"}
                  </h3>
                </div>
                <button
                  onClick={() => setRepoModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="size-4" />
                </button>
              </div>

              {repoModalError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{repoModalError}</span>
                </div>
              )}

              <form onSubmit={handleSaveRepository} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    GitHub Repository URL <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={repoUrlInput}
                    onChange={(e) => setRepoUrlInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Accepts valid public or private HTTPS GitHub repository URLs.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Display Name <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Synapse Core Platform"
                    value={repoNameInput}
                    onChange={(e) => setRepoNameInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setRepoModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={repoSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                  >
                    {repoSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {repository ? "Save Changes" : "Register Repository"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM REMOVE REPOSITORY */}
        {removeRepoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Remove Repository Association?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This will unlink the primary repository from this project.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg leading-relaxed">
                Historical task references and commit links will <strong className="text-foreground">remain preserved</strong>.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRemoveRepoModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveRepository}
                  disabled={removingRepo}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
                >
                  {removingRepo ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT REFERENCE */}
        {editRefModalOpen && editingRef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Edit2 className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Edit {editingRef.reference_type === "COMMIT" ? "Commit" : "Pull Request"} Reference
                  </h3>
                </div>
                <button
                  onClick={() => setEditRefModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="size-4" />
                </button>
              </div>

              {editRefError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{editRefError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateReference} className="space-y-4">
                <div>
                  <span className="block text-xs font-semibold text-foreground mb-1">Associated Task</span>
                  <p className="text-xs text-muted-foreground font-medium p-2 rounded-lg bg-muted/30">
                    {editingRef.task_title}
                  </p>
                </div>

                {editingRef.reference_type === "COMMIT" ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Commit Hash <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={editCommitHash}
                        onChange={(e) => setEditCommitHash(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Commit URL <span className="text-muted-foreground font-normal">(Optional)</span>
                      </label>
                      <input
                        type="url"
                        value={editCommitUrl}
                        onChange={(e) => setEditCommitUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Pull Request URL <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="url"
                      value={editPrUrl}
                      onChange={(e) => setEditPrUrl(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Description / Notes</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={500}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditRefModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingRef}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                  >
                    {updatingRef ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CONFIRM DELETE REFERENCE */}
        {deleteRefModalOpen && deletingRef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delete Git Reference?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This link will be permanently removed from this task.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">Task:</strong> {deletingRef.task_title}
                </p>
                <p>
                  <strong className="text-foreground">Type:</strong> {deletingRef.reference_type}
                </p>
                {deletingRef.commit_hash && (
                  <p className="font-mono">
                    <strong className="text-foreground">Hash:</strong> {deletingRef.commit_hash.substring(0, 8)}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDeleteRefModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReference}
                  disabled={confirmingDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
                >
                  {confirmingDelete ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Delete Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
