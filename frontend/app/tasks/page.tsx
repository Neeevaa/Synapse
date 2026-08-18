"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";

function formatWorkstreamLabel(ws: string | null) {
  if (!ws) return "General";
  switch (ws) {
    case "UI_UX":
      return "UI / UX";
    case "AI_ML":
      return "AI / ML";
    case "FRONTEND":
      return "Frontend";
    case "BACKEND":
      return "Backend";
    case "QA":
      return "QA & Testing";
    case "DEVOPS":
      return "DevOps";
    default:
      return ws;
  }
}

function getWorkstreamBadgeStyle(ws: string | null) {
  switch (ws) {
    case "FRONTEND":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
    case "BACKEND":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "AI_ML":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "UI_UX":
      return "bg-pink-500/10 text-pink-600 border-pink-500/20";
    case "QA":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "DEVOPS":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  }
}
import {
  CheckSquare,
  FolderKanban,
  Loader2,
  AlertCircle,
  Filter,
  ArrowRight,
  ChevronDown,
  Layers,
  Search,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface TaskItem {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  workstream: string | null;
  story_points: number | null;
  position: number;
  assignee_id: string | null;
  assignee_name?: string | null;
  created_at?: string;
}

export default function TasksPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch all accessible projects
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const res = await api.get("/projects");
      const projList = res.data.data.projects || [];
      setProjects(projList);
      if (projList.length > 0) {
        setSelectedProjectId(projList[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load projects.");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Fetch tasks for selected project
  const fetchTasks = useCallback(async (projId: string) => {
    if (!projId) return;
    setLoadingTasks(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projId}/tasks`);
      setTasks(res.data.data.tasks || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tasks.");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId, fetchTasks]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Filter task list dynamically
  const filteredTasks = tasks.filter((t) => {
    if (selectedStatus !== "ALL" && t.status !== selectedStatus) return false;
    if (selectedWorkstream !== "ALL" && t.workstream !== selectedWorkstream) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "DONE":
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "IN_REVIEW":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "CANCELLED":
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case "URGENT":
      case "HIGH":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <ProtectedShell pageTitle="Tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Tasks Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Monitor, filter, and track task tickets across your active projects.
            </p>
          </div>

          {/* Project Selector */}
          {!loadingProjects && projects.length > 0 && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1.5 shadow-2xs">
              <FolderKanban className="size-4 text-primary ml-2 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Project:</span>
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-foreground pr-8 pl-2 py-1 border-none outline-none appearance-none cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground">
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Global Loading */}
        {loadingProjects && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error Alert */}
        {error && !loadingProjects && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty Projects State */}
        {!loadingProjects && !error && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <CheckSquare className="size-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-base font-bold text-foreground">No Projects Found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Create a project first to start delegating and managing task tickets.
            </p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/95"
              >
                Go to Projects
              </Link>
            </div>
          </div>
        )}

        {/* Tasks Area */}
        {!loadingProjects && !error && selectedProjectId && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter tasks by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <span className="font-semibold text-muted-foreground">Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {/* Workstream Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-muted-foreground">Workstream:</span>
                  <select
                    value={selectedWorkstream}
                    onChange={(e) => setSelectedWorkstream(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    <option value="ALL">All Workstreams</option>
                    <option value="FRONTEND">Frontend</option>
                    <option value="BACKEND">Backend</option>
                    <option value="AI_ML">AI / ML</option>
                    <option value="UI_UX">UI / UX</option>
                    <option value="QA">QA & Testing</option>
                    <option value="DEVOPS">DevOps</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                {/* Link to Sprint Board */}
                <Link
                  href={`/projects/${selectedProjectId}/board`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/95 transition-colors shrink-0"
                >
                  <Layers className="size-3.5" /> Sprint Board <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            {/* Task Table / List */}
            {loadingTasks ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
                <CheckSquare className="size-10 text-muted-foreground mx-auto" />
                <h4 className="mt-3 text-base font-bold text-foreground">No Tasks Match Filters</h4>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  {tasks.length === 0
                    ? `No tasks have been created for ${selectedProject?.name || "this project"} yet.`
                    : "Try clearing or broadening your search and filter criteria."}
                </p>
                <div className="mt-4">
                  <Link
                    href={`/projects/${selectedProjectId}/board`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
                  >
                    Create Task on Board
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[0.75rem] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4">Task Title</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Workstream</th>
                        <th className="py-3 px-4 text-center">Points</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {filteredTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            <div className="space-y-0.5">
                              <div className="line-clamp-1">{t.title}</div>
                              {t.description && (
                                <div className="text-[0.75rem] font-normal text-muted-foreground line-clamp-1">
                                  {t.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[0.7rem] font-semibold uppercase tracking-wider ${getStatusBadgeStyle(t.status)}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] uppercase tracking-wider border ${getPriorityBadgeStyle(t.priority)}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {t.workstream ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.7rem] font-semibold border ${getWorkstreamBadgeStyle(t.workstream)}`}>
                                {formatWorkstreamLabel(t.workstream)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[0.7rem]">General</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-foreground whitespace-nowrap">
                            {t.story_points !== null ? `${t.story_points} pts` : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              href={`/projects/${selectedProjectId}/board`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              Open Board <ArrowRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
