"use client";

import { useEffect, useState } from "react";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Plus,
  Play,
  Layers,
  Sparkles,
  ShieldAlert,
  FileText,
  CheckCircle2,
  HelpCircle,
  Activity,
  Cpu,
  Database,
  Search,
  Zap,
} from "lucide-react";

interface EvaluationDataset {
  id: string;
  name: string;
  description?: string | null;
  version: string;
  created_by?: string | null;
  created_at: string;
  case_count: number;
}

interface EvaluationCase {
  id: string;
  dataset_id: string;
  case_type: "CONTEXT_RICH" | "CONTEXT_POOR";
  requirement_text: string;
  requirement_type: string;
  project_context?: string | null;
  expected_issue_types: string[];
  expected_severities: string[];
  expected_sources: string[];
  has_issue: boolean;
  ground_truth_notes?: string | null;
  created_at: string;
}

interface EvaluationRun {
  id: string;
  dataset_id: string;
  condition: "LLM_ONLY" | "RAG_LLM" | "RAG_LLM_HUMAN";
  model_name: string;
  prompt_version: string;
  embedding_model?: string | null;
  retrieval_top_k: number;
  chunk_configuration: any;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  started_at: string;
  completed_at?: string | null;
  configuration_metadata?: any;
  aggregate_precision: number;
  aggregate_recall: number;
  aggregate_f1: number;
  aggregate_precision_at_k: number;
  aggregate_recall_at_k: number;
  aggregate_mrr: number;
  aggregate_grounding_rate: number;
  aggregate_insufficient_context_rate: number;
  aggregate_human_acceptance_rate: number;
  aggregate_human_rejection_rate: number;
  aggregate_human_modification_rate: number;
  avg_retrieval_latency_ms: number;
  avg_generation_latency_ms: number;
  avg_total_latency_ms: number;
  metrics_by_requirement_type?: any;
  metrics_by_context_type?: any;
}

export default function EvaluationsAdminPage() {
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Dataset state for detail inspector
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [cases, setCases] = useState<EvaluationCase[]>([]);

  // Condition Filter
  const [conditionFilter, setConditionFilter] = useState<string>("ALL");

  // Create Dataset Modal State
  const [showCreateDs, setShowCreateDs] = useState(false);
  const [dsName, setDsName] = useState("");
  const [dsDesc, setDsDesc] = useState("");
  const [dsVer, setDsVer] = useState("1.0");
  const [creatingDs, setCreatingDs] = useState(false);

  // Create Case Modal State
  const [showAddCase, setShowAddCase] = useState(false);
  const [caseReqText, setCaseReqText] = useState("");
  const [caseReqType, setCaseReqType] = useState("FUNCTIONAL");
  const [caseType, setCaseType] = useState<"CONTEXT_RICH" | "CONTEXT_POOR">("CONTEXT_RICH");
  const [caseContext, setCaseContext] = useState("");
  const [caseExpectedIssues, setCaseExpectedIssues] = useState("INCONSISTENCY");
  const [caseExpectedSources, setCaseExpectedSources] = useState("MTG-Security Sync");
  const [caseNotes, setCaseNotes] = useState("");
  const [addingCase, setAddingCase] = useState(false);

  // Create Run Modal State
  const [showCreateRun, setShowCreateRun] = useState(false);
  const [runDatasetId, setRunDatasetId] = useState("");
  const [runCondition, setRunCondition] = useState<"LLM_ONLY" | "RAG_LLM" | "RAG_LLM_HUMAN">("RAG_LLM");
  const [runModel, setRunModel] = useState("mock-deterministic-v1");
  const [runPromptVer, setRunPromptVer] = useState("REQUIREMENT_REVIEW_PROMPT_V1");
  const [runEmbedModel, setRunEmbedModel] = useState("text-embedding-3-small");
  const [runTopK, setRunTopK] = useState(5);
  const [executingRun, setExecutingRun] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dsRes, runRes] = await Promise.all([
        api.get("/admin/evaluations/datasets"),
        api.get("/admin/evaluations/runs"),
      ]);
      const fetchedDatasets: EvaluationDataset[] = dsRes.data.data || [];
      setDatasets(fetchedDatasets);
      setRuns(runRes.data.data || []);

      if (fetchedDatasets.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(fetchedDatasets[0].id);
        fetchCases(fetchedDatasets[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load evaluation framework data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async (datasetId: string) => {
    try {
      const res = await api.get(`/admin/evaluations/datasets/${datasetId}/cases`);
      setCases(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDs(true);
    try {
      await api.post("/admin/evaluations/datasets", {
        name: dsName,
        description: dsDesc || undefined,
        version: dsVer,
      });
      setShowCreateDs(false);
      setDsName("");
      setDsDesc("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create dataset.");
    } finally {
      setCreatingDs(false);
    }
  };

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;
    setAddingCase(true);
    try {
      const issueTypes = caseExpectedIssues
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const sources = caseExpectedSources
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await api.post(`/admin/evaluations/datasets/${selectedDatasetId}/cases`, {
        case_type: caseType,
        requirement_text: caseReqText,
        requirement_type: caseReqType,
        project_context: caseContext || undefined,
        expected_issue_types: issueTypes,
        expected_severities: ["HIGH"],
        expected_sources: sources,
        has_issue: issueTypes.length > 0,
        ground_truth_notes: caseNotes || undefined,
      });

      setShowAddCase(false);
      setCaseReqText("");
      setCaseContext("");
      fetchCases(selectedDatasetId);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add case.");
    } finally {
      setAddingCase(false);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecutingRun(true);
    try {
      await api.post("/admin/evaluations/runs", {
        dataset_id: runDatasetId || selectedDatasetId,
        condition: runCondition,
        model_name: runModel,
        prompt_version: runPromptVer,
        embedding_model: runCondition === "LLM_ONLY" ? undefined : runEmbedModel,
        retrieval_top_k: Number(runTopK),
      });

      setShowCreateRun(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to execute evaluation run.");
    } finally {
      setExecutingRun(false);
    }
  };

  const filteredRuns = runs.filter((r) => conditionFilter === "ALL" || r.condition === conditionFilter);
  const latestCompletedRun = runs.find((r) => r.status === "COMPLETED");

  const conditionBadgeStyle = (cond: string) => {
    switch (cond) {
      case "LLM_ONLY":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "RAG_LLM":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "RAG_LLM_HUMAN":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <ProtectedShell>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20">
                SUPER ADMIN
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <BarChart3 className="size-6 text-purple-400" /> AI Requirement Review Evaluation Framework
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Empirical quantitative benchmark comparing <code className="text-slate-300">LLM_ONLY</code> vs <code className="text-cyan-400">RAG_LLM</code> vs <code className="text-purple-400">RAG_LLM_HUMAN</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateDs(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Plus className="size-4" /> Create Dataset
            </button>
            <button
              onClick={() => {
                setRunDatasetId(selectedDatasetId || (datasets[0]?.id ?? ""));
                setShowCreateRun(true);
              }}
              disabled={datasets.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-xs font-bold text-white hover:bg-purple-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Play className="size-4" /> Execute Run
            </button>
          </div>
        </div>

        {/* Comparative Non-Claim Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3">
          <ShieldAlert className="size-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-purple-300">Comparative Empirical Design Policy</span>
            <p className="text-purple-200/90 leading-relaxed">
              To guarantee research integrity, Synapse strictly enforces that RAG improvement claims are held until both <strong className="text-slate-200 font-mono">LLM_ONLY</strong> and <strong className="text-cyan-300 font-mono">RAG_LLM</strong> experiments are executed side-by-side on identical human-verified evaluation datasets.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
            <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Datasets</span>
            <div className="text-xl font-extrabold text-foreground">{datasets.length}</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
            <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Evaluation Runs</span>
            <div className="text-xl font-extrabold text-foreground">{runs.length}</div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-1 shadow-2xs">
            <span className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Latest Model</span>
            <div className="text-xs font-mono font-bold text-purple-400 truncate">
              {latestCompletedRun ? latestCompletedRun.model_name : "N/A"}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1 shadow-2xs">
            <span className="text-[0.7rem] font-semibold text-purple-400 uppercase tracking-wider">Latest F1 Score</span>
            <div className="text-xl font-extrabold text-purple-400">
              {latestCompletedRun ? latestCompletedRun.aggregate_f1.toFixed(2) : "0.00"}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-1 shadow-2xs">
            <span className="text-[0.7rem] font-semibold text-cyan-400 uppercase tracking-wider">Precision@K</span>
            <div className="text-xl font-extrabold text-cyan-400">
              {latestCompletedRun ? latestCompletedRun.aggregate_precision_at_k.toFixed(2) : "0.00"}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1 shadow-2xs">
            <span className="text-[0.7rem] font-semibold text-emerald-400 uppercase tracking-wider">Grounding Rate</span>
            <div className="text-xl font-extrabold text-emerald-400">
              {latestCompletedRun ? `${(latestCompletedRun.aggregate_grounding_rate * 100).toFixed(0)}%` : "0%"}
            </div>
          </div>
        </div>

        {/* Condition Filter Bar & Comparison Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-purple-400" />
              <h2 className="text-base font-bold text-foreground">Experiment Run Comparison</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Condition:</span>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
              >
                <option value="ALL">All Conditions</option>
                <option value="LLM_ONLY">LLM_ONLY</option>
                <option value="RAG_LLM">RAG_LLM</option>
                <option value="RAG_LLM_HUMAN">RAG_LLM_HUMAN</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="size-6 animate-spin mx-auto text-purple-500" />
              <p>Loading experiment runs...</p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <HelpCircle className="size-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No evaluation runs executed yet.</p>
              <p>Execute an evaluation run to begin comparative empirical benchmarks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Embedding Model</th>
                    <th className="py-3 px-4">Prompt</th>
                    <th className="py-3 px-4">Top K</th>
                    <th className="py-3 px-4 font-mono text-purple-400">F1</th>
                    <th className="py-3 px-4 font-mono text-slate-300">Precision</th>
                    <th className="py-3 px-4 font-mono text-slate-300">Recall</th>
                    <th className="py-3 px-4 text-cyan-400">P@K</th>
                    <th className="py-3 px-4 text-emerald-400">Grounding %</th>
                    <th className="py-3 px-4 text-right">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRuns.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className={`px-2 py-0.5 rounded-md border text-[0.7rem] font-bold ${conditionBadgeStyle(r.condition)}`}>
                          {r.condition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">{r.model_name}</td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {r.embedding_model || <span className="text-slate-600">NULL (LLM_ONLY)</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{r.prompt_version}</td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{r.retrieval_top_k}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-400">{r.aggregate_f1.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{r.aggregate_precision.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{r.aggregate_recall.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-400">{r.aggregate_precision_at_k.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">{(r.aggregate_grounding_rate * 100).toFixed(0)}%</td>
                      <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">{r.avg_total_latency_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dataset & Case Inspector */}
        {datasets.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Database className="size-5 text-cyan-400" />
                <h2 className="text-base font-bold text-foreground">Human-Verified Ground Truth Dataset Inspector</h2>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedDatasetId}
                  onChange={(e) => {
                    setSelectedDatasetId(e.target.value);
                    fetchCases(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (v{d.version}) — {d.case_count} cases
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAddCase(true)}
                  disabled={!selectedDatasetId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="size-3.5" /> Add Case
                </button>
              </div>
            </div>

            {/* Cases List */}
            <div className="space-y-3">
              {cases.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No cases added to this dataset yet. Click "Add Case" to enter human-verified ground truth cases.
                </div>
              ) : (
                cases.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[0.7rem] font-bold ${c.case_type === "CONTEXT_RICH" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"}`}>
                          {c.case_type}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-muted border border-border text-[0.7rem] font-mono text-muted-foreground">
                          {c.requirement_type}
                        </span>
                      </div>
                      <span className="text-[0.75rem] font-mono text-purple-400">
                        Expected Issues: {c.expected_issue_types.join(", ") || "None (Clean)"}
                      </span>
                    </div>

                    <p className="text-xs text-foreground font-medium leading-relaxed">{c.requirement_text}</p>
                    {c.project_context && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[0.7rem] font-mono text-slate-300">
                        {c.project_context}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Create Dataset */}
        {showCreateDs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-foreground">Create Evaluation Dataset</h3>
              <form onSubmit={handleCreateDataset} className="space-y-3 text-xs">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Dataset Name</label>
                  <input
                    type="text"
                    required
                    value={dsName}
                    onChange={(e) => setDsName(e.target.value)}
                    placeholder="e.g. Security Requirements Benchmark"
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    value={dsDesc}
                    onChange={(e) => setDsDesc(e.target.value)}
                    placeholder="Brief description of benchmark cases"
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Version</label>
                  <input
                    type="text"
                    value={dsVer}
                    onChange={(e) => setDsVer(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateDs(false)}
                    className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingDs}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 cursor-pointer"
                  >
                    {creatingDs ? "Creating..." : "Save Dataset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Case */}
        {showAddCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">Add Human-Verified Evaluation Case</h3>
                <span className="text-[0.7rem] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  ⚠️ Ground truth must be human verified
                </span>
              </div>

              <form onSubmit={handleAddCase} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Case Type</label>
                    <select
                      value={caseType}
                      onChange={(e: any) => setCaseType(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                    >
                      <option value="CONTEXT_RICH">CONTEXT_RICH (With context)</option>
                      <option value="CONTEXT_POOR">CONTEXT_POOR (Insufficient context)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Requirement Type</label>
                    <select
                      value={caseReqType}
                      onChange={(e) => setCaseReqType(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                    >
                      <option value="FUNCTIONAL">Functional</option>
                      <option value="NON_FUNCTIONAL">Non-Functional</option>
                      <option value="USER_STORY">User Story</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Requirement Text</label>
                  <textarea
                    rows={3}
                    required
                    value={caseReqText}
                    onChange={(e) => setCaseReqText(e.target.value)}
                    placeholder="Enter target requirement specification text..."
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Simulated Project Context (Optional for CONTEXT_POOR)</label>
                  <textarea
                    rows={3}
                    value={caseContext}
                    onChange={(e) => setCaseContext(e.target.value)}
                    placeholder="e.g. [SOURCE: MTG-Security Sync] Access tokens must expire in 15 mins..."
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono text-[0.75rem]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Expected Issue Types (Comma separated)</label>
                    <input
                      type="text"
                      value={caseExpectedIssues}
                      onChange={(e) => setCaseExpectedIssues(e.target.value)}
                      placeholder="INCONSISTENCY, AMBIGUITY"
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono text-[0.75rem]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Expected Source References</label>
                    <input
                      type="text"
                      value={caseExpectedSources}
                      onChange={(e) => setCaseExpectedSources(e.target.value)}
                      placeholder="MTG-Security Sync"
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono text-[0.75rem]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Human Ground Truth Notes</label>
                  <input
                    type="text"
                    value={caseNotes}
                    onChange={(e) => setCaseNotes(e.target.value)}
                    placeholder="Reasoning for human ground-truth labels..."
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCase(false)}
                    className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingCase}
                    className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 cursor-pointer"
                  >
                    {addingCase ? "Saving..." : "Save Case"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Execute Run */}
        {showCreateRun && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-foreground">Execute Experiment Run</h3>
              <form onSubmit={handleCreateRun} className="space-y-3 text-xs">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Evaluation Condition</label>
                  <select
                    value={runCondition}
                    onChange={(e: any) => setRunCondition(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-bold"
                  >
                    <option value="LLM_ONLY">LLM_ONLY (No retrieval, no context)</option>
                    <option value="RAG_LLM">RAG_LLM (Full vector retrieval + context)</option>
                    <option value="RAG_LLM_HUMAN">RAG_LLM_HUMAN (RAG + Human decision metrics)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">Model Name</label>
                  <input
                    type="text"
                    value={runModel}
                    onChange={(e) => setRunModel(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono"
                  />
                </div>

                {runCondition !== "LLM_ONLY" && (
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Embedding Model</label>
                    <input
                      type="text"
                      value={runEmbedModel}
                      onChange={(e) => setRunEmbedModel(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Prompt Version</label>
                    <input
                      type="text"
                      value={runPromptVer}
                      onChange={(e) => setRunPromptVer(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono text-[0.7rem]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">Top K</label>
                    <input
                      type="number"
                      value={runTopK}
                      onChange={(e) => setRunTopK(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateRun(false)}
                    className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={executingRun}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 cursor-pointer"
                  >
                    {executingRun ? "Executing Run..." : "Launch Run"}
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
