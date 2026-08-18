"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  Zap,
  ArrowRight,
  FolderKanban,
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  ChevronDown,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Play,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface SprintItem {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  capacity: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}

export default function SprintsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sprints, setSprints] = useState<SprintItem[]>([]);
  const [activeSprint, setActiveSprint] = useState<SprintItem | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Permissions
  const [userRole, setUserRole] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<string | null>(null);
  const [activatingSprintId, setActivatingSprintId] = useState<string | null>(null);

  // Edit Sprint Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState<SprintItem | null>(null);
  const [updatingSprint, setUpdatingSprint] = useState(false);
  const [editSprintError, setEditSprintError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editStatus, setEditStatus] = useState<"PLANNED" | "ACTIVE" | "COMPLETED">("PLANNED");
  const [editCapacity, setEditCapacity] = useState<number | "">("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Delete Sprint Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<SprintItem | null>(null);
  const [deletingSprint, setDeletingSprint] = useState(false);
  const [deleteSprintError, setDeleteSprintError] = useState<string | null>(null);

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

  // Fetch permissions for current user in selected project
  const fetchPermissions = useCallback(async (projId: string) => {
    if (!projId) return;
    try {
      const [meRes, membersRes] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get(`/projects/${projId}/members`),
      ]);
      if (meRes.status === "fulfilled") {
        const me = meRes.value.data.data;
        setUserRole(me.role);
        const userId = me.id;
        if (membersRes.status === "fulfilled") {
          const members = membersRes.value.data.data.members || [];
          const currentMember = members.find((m: any) => m.user_id === userId);
          setProjectRole(currentMember?.role || null);
        }
      }
    } catch {
      // Permission checks default safely
    }
  }, []);

  // Fetch sprints for selected project
  const fetchSprints = useCallback(async (projId: string) => {
    if (!projId) return;
    setLoadingSprints(true);
    setError(null);
    try {
      const [sprintsRes, activeRes] = await Promise.allSettled([
        api.get(`/projects/${projId}/sprints`),
        api.get(`/projects/${projId}/sprints/active`),
      ]);

      if (sprintsRes.status === "fulfilled") {
        setSprints(sprintsRes.value.data.data.sprints || []);
      } else {
        setSprints([]);
      }

      if (activeRes.status === "fulfilled" && activeRes.value.data.data) {
        setActiveSprint(activeRes.value.data.data);
      } else {
        setActiveSprint(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load sprint details.");
    } finally {
      setLoadingSprints(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSprints(selectedProjectId);
      fetchPermissions(selectedProjectId);
    }
  }, [selectedProjectId, fetchSprints, fetchPermissions]);

  const isCompanyAdmin = userRole === "OWNER" || userRole === "ADMIN";
  const isPM = isCompanyAdmin || projectRole === "PROJECT_MANAGER";

  const formatDate = (iso?: string | null) => {
    if (!iso) return "Unscheduled";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleOpenEditModal = (sprint: SprintItem) => {
    setSprintToEdit(sprint);
    setEditName(sprint.name);
    setEditGoal(sprint.goal || "");
    setEditStatus(sprint.status);
    setEditCapacity(sprint.capacity !== null && sprint.capacity !== undefined ? sprint.capacity : "");
    setEditStartDate(sprint.start_date ? new Date(sprint.start_date).toISOString().split("T")[0] : "");
    setEditEndDate(sprint.end_date ? new Date(sprint.end_date).toISOString().split("T")[0] : "");
    setEditSprintError(null);
    setEditModalOpen(true);
  };

  const handleUpdateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintToEdit) return;
    if (!editName.trim()) {
      setEditSprintError("Sprint name is required.");
      return;
    }
    setUpdatingSprint(true);
    setEditSprintError(null);

    try {
      const payload: any = {
        name: editName.trim(),
        goal: editGoal.trim() || undefined,
        status: editStatus,
        capacity: editCapacity !== "" ? Number(editCapacity) : undefined,
        start_date: editStartDate ? new Date(editStartDate).toISOString() : undefined,
        end_date: editEndDate ? new Date(editEndDate).toISOString() : undefined,
      };

      await api.put(`/sprints/${sprintToEdit.id}`, payload);
      setEditModalOpen(false);
      setSprintToEdit(null);
      fetchSprints(selectedProjectId);
    } catch (err: any) {
      setEditSprintError(err.response?.data?.message || "Failed to update sprint.");
    } finally {
      setUpdatingSprint(false);
    }
  };

  const handleOpenDeleteModal = (sprint: SprintItem) => {
    setSprintToDelete(sprint);
    setDeleteSprintError(null);
    setDeleteModalOpen(true);
  };

  const handleDeleteSprint = async () => {
    if (!sprintToDelete) return;
    setDeletingSprint(true);
    setDeleteSprintError(null);

    try {
      await api.delete(`/sprints/${sprintToDelete.id}`);
      setDeleteModalOpen(false);
      setSprintToDelete(null);
      fetchSprints(selectedProjectId);
    } catch (err: any) {
      setDeleteSprintError(err.response?.data?.message || "Failed to delete sprint.");
    } finally {
      setDeletingSprint(false);
    }
  };

  const handleSetActiveSprint = async (sprint: SprintItem) => {
    if (sprint.status === "ACTIVE") return;
    setActivatingSprintId(sprint.id);
    setError(null);
    try {
      await api.put(`/sprints/${sprint.id}`, { status: "ACTIVE" });
      fetchSprints(selectedProjectId);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to set sprint as active.");
    } finally {
      setActivatingSprintId(null);
    }
  };

  const activeSprintsList = sprints.filter((s) => s.status === "ACTIVE");
  const upcomingSprintsList = sprints.filter((s) => s.status === "PLANNED");
  const completedSprintsList = sprints.filter((s) => s.status === "COMPLETED");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <ProtectedShell pageTitle="Sprints">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Sprints & Milestones</h2>
            <p className="text-sm text-muted-foreground">
              Plan, monitor, and review sprint delivery iterations across your projects.
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
            <Zap className="size-12 text-muted-foreground mx-auto" />
            <h3 className="mt-4 text-base font-bold text-foreground">No Projects Available</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Create a project first to start planning sprint iterations and managing deliverables.
            </p>
            <div className="mt-6">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95"
              >
                Go to Projects
              </Link>
            </div>
          </div>
        )}

        {/* Sprints Content Area */}
        {!loadingProjects && !error && selectedProjectId && (
          <div className="space-y-6">
            {loadingSprints ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            ) : (
              <>
                {/* Active Sprint Highlight Banner */}
                {activeSprint ? (
                  <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card p-6 shadow-2xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            ACTIVE SPRINT
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {formatDate(activeSprint.start_date)} – {formatDate(activeSprint.end_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-foreground">{activeSprint.name}</h3>

                          {/* PM Only: Edit & Delete buttons */}
                          {isPM && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(activeSprint)}
                                className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Edit Sprint"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(activeSprint)}
                                className="p-1.5 rounded-lg border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors cursor-pointer"
                                title="Delete Sprint"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {activeSprint.goal && (
                          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                            <span className="font-semibold text-foreground">Goal: </span>
                            {activeSprint.goal}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {activeSprint.capacity !== null && (
                          <div className="px-4 py-2 rounded-lg bg-card border border-border text-center">
                            <div className="text-xs text-muted-foreground">Capacity</div>
                            <div className="text-base font-bold text-foreground">{activeSprint.capacity} pts</div>
                          </div>
                        )}
                        <Link
                          href={`/projects/${selectedProjectId}/board`}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/95 transition-colors"
                        >
                          <Zap className="size-4" /> Open Sprint Board <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No Active Sprint Banner */
                  <div className="rounded-xl border border-border bg-card p-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                        <Clock className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">No Active Sprint Running</h4>
                        <p className="text-xs text-muted-foreground">
                          Select an upcoming sprint to activate or view project backlog items.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/projects/${selectedProjectId}/board`}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                      <Layers className="size-4 text-primary" /> View Sprint Board
                    </Link>
                  </div>
                )}

                {/* Sprints Grouped Sections */}
                {sprints.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
                    <Layers className="size-10 text-muted-foreground mx-auto" />
                    <h4 className="mt-3 text-base font-bold text-foreground">No Sprints Found</h4>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                      No sprint cycles have been created for {selectedProject?.name || "this project"} yet.
                    </p>
                    {isPM && (
                      <div className="mt-4">
                        <Link
                          href={`/projects/${selectedProjectId}/board`}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95"
                        >
                          Create Sprint on Board
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Active Sprints */}
                    {activeSprintsList.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Zap className="size-3.5 text-emerald-500" /> Active Iteration ({activeSprintsList.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeSprintsList.map((s) => (
                            <SprintCard
                              key={s.id}
                              sprint={s}
                              projectId={selectedProjectId}
                              isPM={isPM}
                              onEdit={() => handleOpenEditModal(s)}
                              onDelete={() => handleOpenDeleteModal(s)}
                              onSetActive={() => handleSetActiveSprint(s)}
                              isActivating={activatingSprintId === s.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upcoming / Planned Sprints */}
                    {upcomingSprintsList.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Clock className="size-3.5 text-amber-500" /> Planned / Upcoming ({upcomingSprintsList.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {upcomingSprintsList.map((s) => (
                            <SprintCard
                              key={s.id}
                              sprint={s}
                              projectId={selectedProjectId}
                              isPM={isPM}
                              onEdit={() => handleOpenEditModal(s)}
                              onDelete={() => handleOpenDeleteModal(s)}
                              onSetActive={() => handleSetActiveSprint(s)}
                              isActivating={activatingSprintId === s.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Sprints */}
                    {completedSprintsList.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 text-blue-500" /> Completed Iterations ({completedSprintsList.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {completedSprintsList.map((s) => (
                            <SprintCard
                              key={s.id}
                              sprint={s}
                              projectId={selectedProjectId}
                              isPM={isPM}
                              onEdit={() => handleOpenEditModal(s)}
                              onDelete={() => handleOpenDeleteModal(s)}
                              onSetActive={() => handleSetActiveSprint(s)}
                              isActivating={activatingSprintId === s.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* MODAL 1: EDIT SPRINT MODAL (PM Only) */}
        {isPM && editModalOpen && sprintToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 dark:bg-card">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="size-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Edit Sprint</h3>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {editSprintError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2 border border-destructive/20">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{editSprintError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSprint} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Sprint Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    placeholder="e.g. Sprint 2 - Core Auth"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Sprint Goal</label>
                  <textarea
                    rows={2}
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary resize-none"
                    placeholder="Primary objective of this sprint iteration..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                    >
                      <option value="PLANNED">PLANNED</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Capacity (Story Points)</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                      placeholder="e.g. 25"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">End Date</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingSprint}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95 shadow-xs cursor-pointer"
                  >
                    {updatingSprint && <Loader2 className="size-3.5 animate-spin" />}
                    Save Sprint Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: DELETE SPRINT CONFIRMATION MODAL (PM Only) */}
        {isPM && deleteModalOpen && sprintToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
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
                Are you sure you want to delete sprint <strong className="text-foreground font-bold">"{sprintToDelete.name}"</strong>? This will remove the sprint container and detach any associated tasks back to the backlog.
              </p>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingSprint}
                  onClick={handleDeleteSprint}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 shadow-xs cursor-pointer"
                >
                  {deletingSprint && <Loader2 className="size-3.5 animate-spin" />}
                  Delete Sprint
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}

function SprintCard({
  sprint,
  projectId,
  isPM,
  onEdit,
  onDelete,
  onSetActive,
  isActivating,
}: {
  sprint: SprintItem;
  projectId: string;
  isPM: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  isActivating: boolean;
}) {
  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    PLANNED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    COMPLETED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "Unscheduled";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between hover:border-primary/50 transition-all">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-foreground line-clamp-1">{sprint.name}</h4>
            <span className={`px-2 py-0.5 rounded text-[0.7rem] font-bold uppercase tracking-wider border ${statusStyles[sprint.status] || statusStyles.PLANNED}`}>
              {sprint.status}
            </span>
          </div>

          {/* PM Actions: Set Active, Edit & Delete */}
          {isPM && (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Option to set as Active Sprint - only shown if NOT currently ACTIVE */}
              {sprint.status !== "ACTIVE" && (
                <button
                  type="button"
                  disabled={isActivating}
                  onClick={onSetActive}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 text-[0.7rem] font-bold transition-colors cursor-pointer"
                  title="Set as Current Active Sprint"
                >
                  {isActivating ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3 fill-current" />}
                  <span>Set Active</span>
                </button>
              )}

              <button
                type="button"
                onClick={onEdit}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Edit Sprint"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Delete Sprint"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        {sprint.goal && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {sprint.goal}
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
          </span>
          {sprint.capacity !== null && (
            <span className="font-semibold text-foreground">
              {sprint.capacity} pts
            </span>
          )}
        </div>
        <Link
          href={`/projects/${projectId}/board`}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-colors"
        >
          View Board <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
