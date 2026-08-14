"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  GitFork,
  FileText,
  Video,
  CheckSquare,
  Zap,
  ArrowRight,
  Loader2,
  AlertCircle,
  FolderKanban,
  ExternalLink,
  Layers,
} from "lucide-react";

interface NodeItem {
  requirement_id: string;
  requirement_key: string;
  requirement_title: string;
  tasks_count: number;
  meetings_count: number;
  action_items_count: number;
}

interface GraphData {
  project_id: string;
  total_requirements: number;
  total_meetings: number;
  total_tasks: number;
  nodes: NodeItem[];
}

interface DetailTraceability {
  requirement: {
    id: string;
    requirement_key: string;
    title: string;
    requirement_type: string;
    status: string;
    priority: string;
  };
  linked_tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    workstream: string | null;
    story_points: number | null;
  }>;
  linked_meetings: Array<{
    id: string;
    title: string;
    meeting_type: string;
    scheduled_at: string;
    status: string;
  }>;
  linked_action_items: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  linked_sprints: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export default function TraceabilityMatrixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [reqDetail, setReqDetail] = useState<DetailTraceability | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/traceability/graph`);
      setGraph(res.data.data);

      if (res.data.data.nodes.length > 0) {
        setSelectedReqId(res.data.data.nodes[0].requirement_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load traceability graph.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const fetchReqDetail = useCallback(async (reqId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(
        `/projects/${projectId}/traceability/requirements/${reqId}`
      );
      setReqDetail(res.data.data);
    } catch {
      setReqDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedReqId) {
      fetchReqDetail(selectedReqId);
    }
  }, [selectedReqId, fetchReqDetail]);

  return (
    <ProtectedShell pageTitle="Lifecycle Traceability Matrix">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <GitFork className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  Project Lifecycle Traceability Matrix
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  360-degree explicit lineage linking Requirements &harr; Meetings &harr; Action Items &harr; Tasks &harr; Sprints.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${projectId}/requirements`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <FileText className="size-4 text-emerald-500" /> Requirements
              </Link>
              <Link
                href={`/projects/${projectId}/meetings`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Video className="size-4 text-cyan-500" /> Meetings
              </Link>
              <Link
                href={`/projects/${projectId}/board`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
              >
                <FolderKanban className="size-4" /> Board
              </Link>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-muted-foreground">
              Building project traceability matrix...
            </p>
          </div>
        )}

        {/* Error Boundary */}
        {error && !loading && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-2 max-w-lg mx-auto">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-sm font-bold text-foreground">Traceability Error</h3>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && graph && (
          <div className="space-y-6">
            {/* Overview Summary Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Requirements
                </span>
                <span className="text-2xl font-extrabold text-foreground mt-1 block">
                  {graph.total_requirements}
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Meetings Logged
                </span>
                <span className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-1 block">
                  {graph.total_meetings}
                </span>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Execution Tasks
                </span>
                <span className="text-2xl font-extrabold text-primary mt-1 block">
                  {graph.total_tasks}
                </span>
              </div>
            </div>

            {/* Matrix Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Requirements Node List (5 Cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <FileText className="size-4 text-emerald-500" /> Traceability Nodes ({graph.nodes.length})
                </h3>

                {graph.nodes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground italic">
                    No requirements created yet. Create requirements to build the traceability matrix.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {graph.nodes.map((node) => {
                      const isSelected = node.requirement_id === selectedReqId;
                      return (
                        <div
                          key={node.requirement_id}
                          onClick={() => setSelectedReqId(node.requirement_id)}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2 ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                              : "border-border bg-background hover:border-border/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {node.requirement_key}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {node.action_items_count} Action Items
                            </span>
                          </div>

                          <h4 className="font-bold text-foreground truncate">{node.requirement_title}</h4>

                          <div className="flex items-center gap-3 text-muted-foreground pt-1 text-[11px] font-semibold">
                            <span className="flex items-center gap-1">
                              <Video className="size-3 text-cyan-500" /> {node.meetings_count} Meetings
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckSquare className="size-3 text-primary" /> {node.tasks_count} Tasks
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Selected Node Traceability Lineage Detail (7 Cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6">
                {detailLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-2">
                    <Loader2 className="size-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading artifact lineage...</span>
                  </div>
                )}

                {!detailLoading && reqDetail && (
                  <div className="space-y-6">
                    {/* Node Requirement Banner */}
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                          {reqDetail.requirement.requirement_key}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {reqDetail.requirement.requirement_type}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-muted text-muted-foreground border border-border">
                            {reqDetail.requirement.status}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-base font-extrabold text-foreground">{reqDetail.requirement.title}</h3>
                    </div>

                    {/* Linked Meetings & Discussion Context */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Video className="size-4 text-cyan-500" /> Linked Meetings ({reqDetail.linked_meetings.length})
                      </h4>

                      {reqDetail.linked_meetings.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground italic">
                          No meetings currently linked to this requirement.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reqDetail.linked_meetings.map((m) => (
                            <div key={m.id} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-foreground block">{m.title}</span>
                                <span className="text-muted-foreground font-mono">{m.meeting_type}</span>
                              </div>
                              <Link
                                href={`/projects/${projectId}/meetings`}
                                className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                              >
                                View Meeting <ExternalLink className="size-3" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Linked Action Items */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <CheckSquare className="size-4 text-amber-500" /> Linked Action Items ({reqDetail.linked_action_items.length})
                      </h4>

                      {reqDetail.linked_action_items.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground italic">
                          No meeting action items linked to this requirement.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reqDetail.linked_action_items.map((ai) => (
                            <div key={ai.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground">{ai.title}</span>
                              <span className="font-extrabold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                {ai.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Linked Tasks & Sprint Targets */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Layers className="size-4 text-primary" /> Linked Tasks & Sprint Targets ({reqDetail.linked_tasks.length})
                      </h4>

                      {reqDetail.linked_tasks.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground italic">
                          No engineering tasks linked via meeting action items yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reqDetail.linked_tasks.map((t) => (
                            <div key={t.id} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-foreground block">{t.title}</span>
                                <span className="text-muted-foreground font-semibold">{t.workstream || "GENERAL"}</span>
                              </div>
                              <Link
                                href={`/projects/${projectId}/board`}
                                className="font-bold text-primary hover:underline flex items-center gap-1"
                              >
                                View on Board <ArrowRight className="size-3" />
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
