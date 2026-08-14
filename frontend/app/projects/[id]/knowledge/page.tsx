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
  Database,
  RefreshCw,
  Search,
  Cpu,
  Layers,
  FileText,
  ExternalLink,
  Code2,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

interface IndexingStatus {
  total_documents_indexed: number;
  total_chunks_created: number;
  documents_skipped_hash_match: number;
  embedding_model: string;
  embedding_dimension: number;
}

interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  project_id: string;
  company_id: string;
  source_type: string;
  source_id: string;
  source_version?: number | null;
  source_key?: string | null;
  title: string;
  content: string;
  similarity_score: number;
  deep_link_url: string;
}

interface SearchResponseData {
  results: SearchResultItem[];
  total_results: number;
  query_latency_ms: number;
  embedding_model: string;
}

interface RAGContextResponseData {
  project_id: string;
  query: string;
  formatted_context: string;
  sources: SearchResultItem[];
  total_tokens: number;
}

interface TelemetryLogItem {
  id: string;
  query: string;
  top_k: number;
  retrieved_chunk_ids: string[];
  similarity_scores: number[];
  retrieval_latency_ms: number;
  embedding_model: string;
  created_at: string;
}

export default function KnowledgeBasePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<"search" | "rag" | "telemetry">("search");
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<IndexingStatus | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("");
  const [topK, setTopK] = useState<number>(5);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponseData | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // RAG Context State
  const [ragQuery, setRagQuery] = useState("");
  const [constructingRAG, setConstructingRAG] = useState(false);
  const [ragData, setRagData] = useState<RAGContextResponseData | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  // Telemetry State
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogItem[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      const res = await api.get(`/projects/${projectId}/knowledge/telemetry?limit=50`);
      setTelemetryLogs(res.data.data || []);
    } catch (err: any) {
      console.error("Failed to load telemetry logs:", err);
    } finally {
      setLoadingTelemetry(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "telemetry") {
      fetchTelemetry();
    }
  }, [activeTab, fetchTelemetry]);

  const handleIndexArtifacts = async () => {
    setIndexing(true);
    setNotice(null);
    try {
      const res = await api.post(`/projects/${projectId}/knowledge/index`);
      const statusData = res.data.data;
      setIndexStatus(statusData);
      setNotice({
        message: `Indexed ${statusData.total_documents_indexed} documents into ${statusData.total_chunks_created} vector chunks! (${statusData.documents_skipped_hash_match} unchanged skipped)`,
        type: "success",
      });
      if (activeTab === "telemetry") {
        fetchTelemetry();
      }
    } catch (err: any) {
      setNotice({
        message: err.response?.data?.message || "Failed to index project artifacts.",
        type: "error",
      });
    } finally {
      setIndexing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    try {
      const payload = {
        query: searchQuery.trim(),
        top_k: topK,
        source_type: selectedSourceType || undefined,
      };
      const res = await api.post(`/projects/${projectId}/knowledge/search`, payload);
      setSearchResults(res.data.data);
    } catch (err: any) {
      setSearchError(err.response?.data?.message || "Vector similarity search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleConstructRAG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;

    setConstructingRAG(true);
    setRagError(null);
    try {
      const payload = {
        query: ragQuery.trim(),
        top_k: topK,
      };
      const res = await api.post(`/projects/${projectId}/knowledge/rag-context`, payload);
      setRagData(res.data.data);
    } catch (err: any) {
      setRagError(err.response?.data?.message || "Failed to construct RAG prompt context.");
    } finally {
      setConstructingRAG(false);
    }
  };

  return (
    <ProtectedShell>
      <div className="min-h-screen bg-background text-foreground p-6 md:p-10 space-y-8">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
                Project Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground">Knowledge Base & Vector Store</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Database className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Knowledge Base & pgvector Store
                </h1>
                <p className="text-xs text-muted-foreground">
                  Versioned artifact ingestion, token chunking, cosine vector search & RAG context construction
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" /> Back to Project
            </Link>
            <button
              onClick={handleIndexArtifacts}
              disabled={indexing}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {indexing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Indexing Artifacts...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" /> Index Project Artifacts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notice Alert */}
        {notice && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>{notice.message}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
        )}

        {/* Index Status Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Indexed Documents</span>
              <FileText className="size-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">
              {indexStatus?.total_documents_indexed ?? "—"}
            </div>
            <p className="text-[0.7rem] text-muted-foreground">Requirements, Notes, Transcripts, Tasks</p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Vector Chunks</span>
              <Layers className="size-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">
              {indexStatus?.total_chunks_created ?? "—"}
            </div>
            <p className="text-[0.7rem] text-muted-foreground">512-token sliding window chunks</p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Skipped (Hash Match)</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">
              {indexStatus?.documents_skipped_hash_match ?? "—"}
            </div>
            <p className="text-[0.7rem] text-muted-foreground">SHA-256 content deduplication</p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Active Provider & Dim</span>
              <Cpu className="size-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-foreground truncate">
              {indexStatus?.embedding_model ?? "mock-deterministic-v1"}
            </div>
            <p className="text-[0.7rem] text-emerald-500 dark:text-emerald-400 font-medium">
              Dimension: {indexStatus?.embedding_dimension ?? 1536} (Pinned)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-6">
          <button
            onClick={() => setActiveTab("search")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "search"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="size-4" /> Vector Search Playground
          </button>
          <button
            onClick={() => setActiveTab("rag")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "rag"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="size-4" /> RAG Context Inspector
          </button>
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "telemetry"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="size-4" /> Retrieval Telemetry Logs
          </button>
        </div>

        {/* TAB 1: VECTOR SEARCH PLAYGROUND */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter natural language query (e.g. OAuth2 token security specifications)..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <select
                  value={selectedSourceType}
                  onChange={(e) => setSelectedSourceType(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Source Types</option>
                  <option value="REQUIREMENT">Requirements</option>
                  <option value="REQUIREMENT_VERSION">Requirement Versions</option>
                  <option value="MEETING_NOTE">Meeting Notes</option>
                  <option value="MEETING_TRANSCRIPT">Meeting Transcripts</option>
                  <option value="MEETING_ACTION_ITEM">Action Items</option>
                  <option value="TASK">Tasks</option>
                  <option value="SPRINT">Sprints</option>
                </select>

                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>

                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Search Vectors
                </button>
              </div>
            </form>

            {searchError && (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="size-4" /> {searchError}
              </div>
            )}

            {/* Results Section */}
            {searchResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
                  <span>
                    Found <strong className="text-foreground">{searchResults.total_results}</strong> relevant vector chunks
                  </span>
                  <span>Latency: <strong className="text-purple-400">{searchResults.query_latency_ms} ms</strong></span>
                </div>

                <div className="space-y-4">
                  {searchResults.results.map((res) => (
                    <div
                      key={res.chunk_id}
                      className="p-5 rounded-xl border border-border bg-card shadow-xs hover:border-purple-500/40 transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[0.7rem] font-bold uppercase tracking-wider">
                            {res.source_type}
                          </span>
                          {res.source_key && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[0.7rem] font-mono font-semibold">
                              {res.source_key}
                            </span>
                          )}
                          {res.source_version && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[0.7rem] font-medium">
                              v{res.source_version}
                            </span>
                          )}
                          <h3 className="text-sm font-bold text-foreground">{res.title}</h3>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <Sparkles className="size-3" /> {(res.similarity_score * 100).toFixed(1)}% Match
                          </span>
                          <Link
                            href={res.deep_link_url}
                            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                          >
                            Source Artifact <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                        {res.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RAG CONTEXT INSPECTOR */}
        {activeTab === "rag" && (
          <div className="space-y-6">
            <form onSubmit={handleConstructRAG} className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Enter RAG query string to construct grounded LLM prompt context..."
                  className="flex-1 px-4 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={constructingRAG || !ragQuery.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {constructingRAG ? <Loader2 className="size-4 animate-spin" /> : <Code2 className="size-4" />}
                  Construct RAG Context
                </button>
              </div>
            </form>

            {ragError && (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                <AlertCircle className="size-4" /> {ragError}
              </div>
            )}

            {ragData && (
              <div className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Constructed Prompt Context Window</h3>
                    <p className="text-xs text-muted-foreground">
                      Structured grounding citations for LLM requirements review & analysis
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
                    Total Context Tokens: ~{ragData.total_tokens}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/60 border border-border text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[600px]">
                  {ragData.formatted_context}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETRIEVAL TELEMETRY LOGS */}
        {activeTab === "telemetry" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Recent Retrieval Telemetry Logs</h2>
              <button
                onClick={fetchTelemetry}
                disabled={loadingTelemetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {loadingTelemetry ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Refresh
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Query</th>
                      <th className="px-4 py-3">Top K</th>
                      <th className="px-4 py-3">Chunks</th>
                      <th className="px-4 py-3">Scores Range</th>
                      <th className="px-4 py-3">Latency (ms)</th>
                      <th className="px-4 py-3">Embedding Model</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {telemetryLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No retrieval telemetry logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      telemetryLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-[0.75rem] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground max-w-xs truncate">
                            {log.query}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{log.top_k}</td>
                          <td className="px-4 py-3 font-semibold text-purple-400">
                            {log.retrieved_chunk_ids?.length || 0}
                          </td>
                          <td className="px-4 py-3 font-mono text-emerald-400">
                            {log.similarity_scores?.length
                              ? `${(Math.min(...log.similarity_scores) * 100).toFixed(0)}% - ${(Math.max(...log.similarity_scores) * 100).toFixed(0)}%`
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-amber-400">
                            {log.retrieval_latency_ms} ms
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.75rem] text-muted-foreground">
                            {log.embedding_model}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
