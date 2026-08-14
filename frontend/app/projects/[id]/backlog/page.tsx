"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Layers,
  ChevronUp,
  ChevronDown,
  Zap,
  User as UserIcon,
  Check,
  X,
  Edit2,
  ArrowRight,
  Hash,
  Filter,
  AlertTriangle,
  Briefcase,
  PieChart,
  UserCheck,
  Search,
} from "lucide-react";

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
  assignee_name: string | null;
  created_at: string;
}

interface SprintItem {
  id: string;
  name: string;
  status: string;
  goal: string | null;
  capacity: number | null;
  allocated_points?: number;
  remaining_capacity?: number | null;
}

interface ProjectMemberItem {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  specialization: string | null;
}

const WORKSTREAM_OPTIONS = [
  { value: "GENERAL", label: "General", badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
  { value: "UI_UX", label: "UI/UX", badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { value: "FRONTEND", label: "Frontend", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { value: "BACKEND", label: "Backend", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { value: "QA", label: "QA", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { value: "DEVOPS", label: "DevOps", badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  { value: "AI_ML", label: "AI/ML", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
];

function getWorkstreamBadge(ws: string | null) {
  const target = WORKSTREAM_OPTIONS.find((o) => o.value === ws) || WORKSTREAM_OPTIONS[0];
  return (
    <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider border ${target.badgeClass}`}>
      {target.label}
    </span>
  );
}

export default function ProjectBacklogPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any | null>(null);
  const [backlogTasks, setBacklogTasks] = useState<TaskItem[]>([]);
  const [allProjectTasks, setAllProjectTasks] = useState<TaskItem[]>([]);
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User & Scoped Role
  const [userRole, setUserRole] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<string | null>(null);

  // Filters
  const [workstreamTab, setWorkstreamTab] = useState<string>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Inline Story Points & Workstream Editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempPoints, setTempPoints] = useState<string>("");
  const [tempWorkstream, setTempWorkstream] = useState<string>("GENERAL");
  const [tempAssigneeId, setTempAssigneeId] = useState<string>("");

  // Move to Sprint Modal
  const [movingTask, setMovingTask] = useState<TaskItem | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [movingLoading, setMovingLoading] = useState(false);

  // Create Task Modal State
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newWorkstream, setNewWorkstream] = useState("GENERAL");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newSprintId, setNewSprintId] = useState("");
  const [newStoryPoints, setNewStoryPoints] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);

  const canManage =
    userRole === "OWNER" ||
    userRole === "ADMIN" ||
    projectRole === "PROJECT_MANAGER" ||
    projectRole === "TEAM_LEAD";

  const fetchProjectAndBacklog = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Project Details
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data.data);

      // 2. Fetch Backlog Tasks (sprint_id IS NULL)
      const backlogRes = await api.get(`/projects/${projectId}/backlog`);
      setBacklogTasks(backlogRes.data.data.tasks || []);

      // 3. Fetch All Project Tasks (including assigned to sprints)
      const allTasksRes = await api.get(`/projects/${projectId}/tasks`);
      setAllProjectTasks(allTasksRes.data.data.tasks || []);

      // 4. Fetch Sprints
      try {
        const sprintsRes = await api.get(`/projects/${projectId}/sprints`);
        setSprints(sprintsRes.data.data.sprints || []);
      } catch (err) {
        console.error("Failed to load sprints", err);
      }

      // 5. Fetch Project Members
      try {
        const membersRes = await api.get(`/projects/${projectId}/members`);
        setMembers(membersRes.data.data.members || []);
      } catch (err) {
        console.error("Failed to load members", err);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load backlog tasks.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      try {
        const meRes = await api.get("/auth/me");
        setUserRole(meRes.data.data.role);

        try {
          const membersRes = await api.get(`/projects/${projectId}/members`);
          const membersList = membersRes.data.data.members || [];
          const currentMember = membersList.find(
            (m: any) => m.user_id === meRes.data.data.id
          );
          if (currentMember) {
            setProjectRole(currentMember.role);
          }
        } catch {
          // ignore
        }
      } catch {
        // Handled by ProtectedShell
      }
    };

    if (projectId) {
      fetchUserAndRole();
      fetchProjectAndBacklog();
    }
  }, [projectId, fetchProjectAndBacklog]);

  // Reorder Backlog Handler
  const handleMovePosition = async (index: number, direction: "up" | "down") => {
    if (!canManage) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredBacklogTasks.length) return;

    const newTasks = [...filteredBacklogTasks];
    const [moved] = newTasks.splice(index, 1);
    newTasks.splice(targetIndex, 0, moved);

    setBacklogTasks(newTasks);

    try {
      const taskIds = newTasks.map((t) => t.id);
      await api.post(`/projects/${projectId}/backlog/reorder`, { task_ids: taskIds });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reorder backlog.");
      fetchProjectAndBacklog();
    }
  };

  // Save Inline Task Edits
  const handleSaveInlineEdit = async (taskId: string) => {
    if (!canManage) return;
    const pts = tempPoints.trim() === "" ? null : parseInt(tempPoints.trim(), 10);
    if (pts !== null && (isNaN(pts) || pts < 0)) {
      alert("Story points must be a valid non-negative number.");
      return;
    }

    try {
      await api.put(`/tasks/${taskId}`, {
        story_points: pts,
        workstream: tempWorkstream,
        assignee_id: tempAssigneeId ? tempAssigneeId : null,
      });
      setEditingTaskId(null);
      fetchProjectAndBacklog();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update task.");
    }
  };

  // Move Task to Sprint or Backlog
  const handleMoveToSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingTask) return;

    setMovingLoading(true);
    try {
      if (selectedSprintId === "PRODUCT_BACKLOG") {
        await api.put(`/tasks/${movingTask.id}`, { clear_sprint: true });
      } else {
        await api.put(`/tasks/${movingTask.id}`, { sprint_id: selectedSprintId });
      }
      setMovingTask(null);
      setSelectedSprintId("");
      fetchProjectAndBacklog();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update task sprint assignment.");
    } finally {
      setMovingLoading(false);
    }
  };

  // Create Task
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateTaskError("Task title is required.");
      return;
    }

    setCreatingTask(true);
    setCreateTaskError(null);

    const points = newStoryPoints.trim() === "" ? null : parseInt(newStoryPoints.trim(), 10);

    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        priority: newPriority,
        workstream: newWorkstream,
        assignee_id: newAssigneeId ? newAssigneeId : null,
        sprint_id: newSprintId ? newSprintId : null,
        story_points: points,
      });

      setCreateTaskOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("MEDIUM");
      setNewWorkstream("GENERAL");
      setNewAssigneeId("");
      setNewSprintId("");
      setNewStoryPoints("");
      fetchProjectAndBacklog();
    } catch (err: any) {
      setCreateTaskError(err.response?.data?.message || "Failed to create task.");
    } finally {
      setCreatingTask(false);
    }
  };

  // Filtered Product Backlog Tasks
  const filteredBacklogTasks = useMemo(() => {
    return backlogTasks.filter((t) => {
      if (workstreamTab !== "ALL" && t.workstream !== workstreamTab) return false;
      if (filterAssignee === "UNASSIGNED" && t.assignee_id !== null) return false;
      if (filterAssignee !== "ALL" && filterAssignee !== "UNASSIGNED" && t.assignee_id !== filterAssignee) return false;
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  }, [backlogTasks, workstreamTab, filterAssignee, filterPriority, filterStatus, searchQuery]);

  // Sprint Capacity & Workstream Breakdown Calculations
  const sprintPlanningData = useMemo(() => {
    return sprints.map((sprint) => {
      const sprintTasks = allProjectTasks.filter((t) => t.sprint_id === sprint.id);

      const totalAllocatedPoints = sprintTasks.reduce(
        (acc, t) => acc + (t.story_points || 0),
        0
      );

      // Workstream Breakdown
      const workstreamPoints: Record<string, number> = {};
      WORKSTREAM_OPTIONS.forEach((w) => (workstreamPoints[w.value] = 0));
      sprintTasks.forEach((t) => {
        const ws = t.workstream || "GENERAL";
        workstreamPoints[ws] = (workstreamPoints[ws] || 0) + (t.story_points || 0);
      });

      // Assignee Breakdown
      const assigneePoints: Record<string, { name: string; points: number }> = {};
      sprintTasks.forEach((t) => {
        const key = t.assignee_id || "UNASSIGNED";
        const name = t.assignee_name || "Unassigned";
        if (!assigneePoints[key]) {
          assigneePoints[key] = { name, points: 0 };
        }
        assigneePoints[key].points += t.story_points || 0;
      });

      const capacity = sprint.capacity;
      const isOverCapacity = capacity !== null && capacity !== undefined && totalAllocatedPoints > capacity;
      const remainingCapacity = capacity !== null && capacity !== undefined ? capacity - totalAllocatedPoints : null;

      return {
        sprint,
        tasks: sprintTasks,
        totalAllocatedPoints,
        capacity,
        remainingCapacity,
        isOverCapacity,
        workstreamPoints,
        assigneePoints,
      };
    });
  }, [sprints, allProjectTasks]);

  const totalBacklogPoints = filteredBacklogTasks.reduce(
    (acc, t) => acc + (t.story_points || 0),
    0
  );

  return (
    <ProtectedShell pageTitle={project ? `${project.name} — Backlog & Sprint Planning` : "Backlog Architecture"}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${projectId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" /> Back to Project
              </Link>
            </div>
            <h2 className="text-xl font-extrabold text-foreground mt-1 flex items-center gap-2">
              <Layers className="size-6 text-primary" /> Product & Sprint Backlog Planning
            </h2>
          </div>

          {canManage && (
            <button
              onClick={() => setCreateTaskOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="size-4" /> Add Task / Story
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg mx-auto">
            <AlertCircle className="size-10 text-destructive mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">Backlog Error</h3>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && project && (
          <div className="space-y-8">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs flex items-center gap-4">
                <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Layers className="size-6" />
                </div>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground block">
                    Product Backlog Items
                  </span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {backlogTasks.length}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs flex items-center gap-4">
                <div className="size-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Hash className="size-6" />
                </div>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground block">
                    Unassigned Story Points
                  </span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {totalBacklogPoints} pts
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs flex items-center gap-4">
                <div className="size-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <Briefcase className="size-6" />
                </div>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground block">
                    Planned Sprints
                  </span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {sprints.filter((s) => s.status === "PLANNED").length}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs flex items-center gap-4">
                <div className="size-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <Zap className="size-6" />
                </div>
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground block">
                    Active Sprint
                  </span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {sprints.filter((s) => s.status === "ACTIVE").length > 0 ? "Active" : "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Toolbar & Workstream Group Tabs */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-4">
              {/* Grouped Workstream Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
                <button
                  onClick={() => setWorkstreamTab("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    workstreamTab === "ALL"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Workstreams
                </button>
                {WORKSTREAM_OPTIONS.map((ws) => (
                  <button
                    key={ws.value}
                    onClick={() => setWorkstreamTab(ws.value)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      workstreamTab === ws.value
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ws.label}
                  </button>
                ))}
              </div>

              {/* Filtering Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search backlog tasks..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Filter Assignee */}
                <div>
                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">All Assignees</option>
                    <option value="UNASSIGNED">Unassigned Only</option>
                    {members.map((m) => (
                      <option key={m.user_id || m.id} value={m.user_id || ""}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Priority */}
                <div>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Filter Status / Task Type */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">All Task Statuses</option>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 1: PRODUCT BACKLOG */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Layers className="size-5 text-primary" /> Product Backlog
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unassigned stories waiting to be estimated and pulled into a sprint backlog.
                  </p>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {filteredBacklogTasks.length} items ({totalBacklogPoints} pts)
                </span>
              </div>

              {filteredBacklogTasks.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Layers className="size-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No matching product backlog items</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    All tasks have been pulled into sprint backlogs or match no active filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBacklogTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="group p-4 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left Section: Reorder Handle & Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {canManage && (
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleMovePosition(idx, "up")}
                              disabled={idx === 0}
                              title="Move Up"
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronUp className="size-4" />
                            </button>
                            <button
                              onClick={() => handleMovePosition(idx, "down")}
                              disabled={idx === filteredBacklogTasks.length - 1}
                              title="Move Down"
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronDown className="size-4" />
                            </button>
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                              #{idx + 1}
                            </span>

                            {getWorkstreamBadge(task.workstream)}

                            <span
                              className={`text-[0.68rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                task.priority === "URGENT"
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : task.priority === "HIGH"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              {task.priority}
                            </span>

                            <h4 className="text-sm font-bold text-foreground truncate">
                              {task.title}
                            </h4>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 pl-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Section: Story Points & Actions */}
                      <div className="flex items-center gap-4 shrink-0 flex-wrap">
                        {/* Assignee Avatar */}
                        {task.assignee_name ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                            <UserIcon className="size-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">{task.assignee_name}</span>
                          </div>
                        ) : (
                          <span className="text-[0.7rem] text-muted-foreground italic px-2 py-1 bg-muted/40 rounded-lg">
                            Unassigned
                          </span>
                        )}

                        {/* Inline Task Editor */}
                        <div className="flex items-center gap-1">
                          {editingTaskId === task.id ? (
                            <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-primary">
                              <select
                                value={tempWorkstream}
                                onChange={(e) => setTempWorkstream(e.target.value)}
                                className="text-xs rounded border border-border bg-background px-2 py-1 text-foreground"
                              >
                                {WORKSTREAM_OPTIONS.map((w) => (
                                  <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                              </select>

                              <select
                                value={tempAssigneeId}
                                onChange={(e) => setTempAssigneeId(e.target.value)}
                                className="text-xs rounded border border-border bg-background px-2 py-1 text-foreground"
                              >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                  <option key={m.user_id || m.id} value={m.user_id || ""}>
                                    {m.first_name} {m.last_name}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={tempPoints}
                                onChange={(e) => setTempPoints(e.target.value)}
                                placeholder="Pts"
                                className="w-16 px-2 py-1 text-xs rounded border border-primary bg-background focus:outline-none"
                              />

                              <button
                                onClick={() => handleSaveInlineEdit(task.id)}
                                title="Save Task"
                                className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingTaskId(null)}
                                title="Cancel"
                                className="p-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (canManage) {
                                  setEditingTaskId(task.id);
                                  setTempPoints(task.story_points !== null ? String(task.story_points) : "");
                                  setTempWorkstream(task.workstream || "GENERAL");
                                  setTempAssigneeId(task.assignee_id || "");
                                }
                              }}
                              disabled={!canManage}
                              title={canManage ? "Click to edit points, workstream, or assignee" : "Story Points"}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                task.story_points !== null
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              } ${canManage ? "cursor-pointer hover:border-primary" : "cursor-default"}`}
                            >
                              <Hash className="size-3.5" />
                              <span>
                                {task.story_points !== null ? `${task.story_points} pts` : "Unestimated"}
                              </span>
                              {canManage && <Edit2 className="size-3 opacity-60 ml-0.5" />}
                            </button>
                          )}
                        </div>

                        {/* Move to Sprint Action */}
                        {canManage && (
                          <button
                            onClick={() => {
                              setMovingTask(task);
                              setSelectedSprintId(sprints[0]?.id || "");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold cursor-pointer"
                          >
                            <span>Move to Sprint</span>
                            <ArrowRight className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: SPRINT BACKLOG & CAPACITY PLANNING */}
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="size-5 text-primary" /> Sprint Backlog & Capacity Planning
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tasks assigned to planned and active sprints with workstream & assignee capacity breakdown.
                </p>
              </div>

              {sprintPlanningData.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                  No sprints created for this project yet. Use the Sprints tab to create a new sprint.
                </div>
              ) : (
                sprintPlanningData.map(({ sprint, tasks, totalAllocatedPoints, capacity, remainingCapacity, isOverCapacity, workstreamPoints, assigneePoints }) => (
                  <div
                    key={sprint.id}
                    className={`rounded-2xl border bg-card p-6 shadow-2xs space-y-5 transition-all ${
                      isOverCapacity
                        ? "border-destructive/40 ring-1 ring-destructive/20"
                        : "border-border"
                    }`}
                  >
                    {/* Sprint Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-base font-extrabold text-foreground">{sprint.name}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[0.68rem] font-extrabold uppercase tracking-wider border ${
                              sprint.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {sprint.status}
                          </span>
                        </div>
                        {sprint.goal && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <strong>Goal:</strong> {sprint.goal}
                          </p>
                        )}
                      </div>

                      {/* Capacity Metrics */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground block">
                            Allocated / Capacity
                          </span>
                          <span className={`font-extrabold text-sm ${isOverCapacity ? "text-destructive" : "text-foreground"}`}>
                            {totalAllocatedPoints} / {capacity !== null ? `${capacity} pts` : "Uncapped"}
                          </span>
                        </div>
                        {capacity !== null && (
                          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            isOverCapacity
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}>
                            {isOverCapacity ? `Over by ${totalAllocatedPoints - capacity} pts` : `${remainingCapacity} pts remaining`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OVER CAPACITY PM WARNING BANNER */}
                    {isOverCapacity && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3 text-xs text-destructive">
                        <AlertTriangle className="size-5 shrink-0" />
                        <div>
                          <span className="font-extrabold block">PM Warning: Sprint Capacity Exceeded!</span>
                          <span>
                            Total committed story points ({totalAllocatedPoints} pts) exceed target sprint capacity ({capacity} pts). Consider moving items back to Product Backlog.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* WORKSTREAM & ASSIGNEE CAPACITY BREAKDOWN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/60">
                      {/* Workstream Breakdown */}
                      <div className="space-y-2">
                        <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <PieChart className="size-3.5 text-primary" /> Story Points by Workstream
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {WORKSTREAM_OPTIONS.map((ws) => {
                            const pts = workstreamPoints[ws.value] || 0;
                            if (pts === 0) return null;
                            return (
                              <span
                                key={ws.value}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${ws.badgeClass}`}
                              >
                                {ws.label}: <strong>{pts} pts</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Assignee Breakdown */}
                      <div className="space-y-2">
                        <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-primary" /> Story Points by Assignee
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(assigneePoints).map(([key, data]) => (
                            <span
                              key={key}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border text-foreground flex items-center gap-1"
                            >
                              <UserIcon className="size-3 text-muted-foreground" />
                              <span>{data.name}:</span>
                              <strong>{data.points} pts</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sprint Backlog Tasks List */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground block">Committed Tasks ({tasks.length})</span>

                      {tasks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          No tasks committed to this sprint yet. Use Move to Sprint in Product Backlog to assign items.
                        </div>
                      ) : (
                        <div className="divide-y divide-border border border-border rounded-xl bg-background overflow-hidden">
                          {tasks.map((task) => (
                            <div key={task.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                {getWorkstreamBadge(task.workstream)}
                                <span className="text-xs font-bold text-foreground truncate">{task.title}</span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {task.assignee_name && (
                                  <span className="text-[0.7rem] text-muted-foreground font-semibold flex items-center gap-1">
                                    <UserIcon className="size-3 text-primary" /> {task.assignee_name}
                                  </span>
                                )}

                                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  {task.story_points !== null ? `${task.story_points} pts` : "Unestimated"}
                                </span>

                                {canManage && (
                                  <button
                                    onClick={() => {
                                      setMovingTask(task);
                                      setSelectedSprintId("PRODUCT_BACKLOG");
                                    }}
                                    className="text-[0.7rem] font-bold text-destructive hover:underline cursor-pointer"
                                  >
                                    Move to Product Backlog
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Move Task Dialog */}
        {movingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ArrowRight className="size-5 text-primary" /> Assign Task Target
                </h3>
                <button
                  onClick={() => setMovingTask(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Target Task:</span>
                <p className="text-sm font-bold text-foreground">{movingTask.title}</p>
              </div>

              <form onSubmit={handleMoveToSprintSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Select Target Location <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    value={selectedSprintId}
                    onChange={(e) => setSelectedSprintId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="PRODUCT_BACKLOG">-- Return to Product Backlog (Unassign) --</option>
                    {sprints.map((sprint) => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name} ({sprint.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMovingTask(null)}
                    className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={movingLoading || !selectedSprintId}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                  >
                    {movingLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Confirm Move
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {createTaskOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 my-8">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                    <Plus className="size-5 text-primary" /> Create Backlog Task / Story
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plan new work items for Product Backlog or assign directly to a Sprint.
                  </p>
                </div>
                <button
                  onClick={() => setCreateTaskOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {createTaskError && (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs font-semibold text-destructive">
                  <AlertCircle className="size-5 shrink-0" />
                  <span>{createTaskError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTaskSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    Task Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Implement OAuth login endpoint"
                    className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    Task Description & Acceptance Criteria
                  </label>
                  <textarea
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Detailed requirements, edge cases, or acceptance criteria..."
                    className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Workstream <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={newWorkstream}
                      onChange={(e) => setNewWorkstream(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {WORKSTREAM_OPTIONS.map((ws) => (
                        <option key={ws.value} value={ws.value}>{ws.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Assignee Member
                    </label>
                    <select
                      value={newAssigneeId}
                      onChange={(e) => setNewAssigneeId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user_id || m.id} value={m.user_id || ""}>
                          {m.first_name} {m.last_name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Priority Level
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Target Sprint
                    </label>
                    <select
                      value={newSprintId}
                      onChange={(e) => setNewSprintId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Product Backlog (Unassigned)</option>
                      {sprints.map((sprint) => (
                        <option key={sprint.id} value={sprint.id}>
                          {sprint.name} ({sprint.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      Story Points
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newStoryPoints}
                      onChange={(e) => setNewStoryPoints(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateTaskOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creatingTask ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Create Task
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
