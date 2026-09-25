"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SuperAdminShell from "@/components/SuperAdminShell";
import { api } from "@/lib/api";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Layers,
  HardDrive,
  Cpu,
  Workflow,
  Users,
  Search,
  Check,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface EnterpriseRequestItem {
  id: string;
  company_id: string;
  company_name: string;
  company_slug?: string;
  requester_user_id: string;
  requester_name: string;
  requester_email: string;
  status: "PENDING" | "UNDER_REVIEW" | "PAYMENT_PENDING" | "ACTIVATED" | "REJECTED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  business_justification?: string | null;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  requested_resources: {
    max_users?: number;
    max_projects?: number;
    max_storage_bytes?: number;
    max_ai_executions?: number;
    max_automation_workflows?: number;
  };
  requested_capabilities: string[];
  approved_resources?: {
    max_users?: number;
    max_projects?: number;
    max_storage_bytes?: number;
    max_ai_executions?: number;
    max_automation_workflows?: number;
  } | null;
  approved_capabilities?: string[] | null;
  calculated_price?: number | null;
  price_breakdown?: {
    base_fee: number;
    capabilities_subtotal: number;
    capabilities_items: Array<{ key: string; name: string; monthly_rate: number }>;
    resources_subtotal: number;
    resource_items: Array<{ key: string; label: string; limit_value: number; surcharge: number }>;
    total_monthly_price: number;
  } | null;
  pricing_version?: string | null;
}

const CAPABILITY_DEFINITIONS = [
  { key: "ai_agents", label: "Autonomous AI Agents", category: "Core Intelligence", monthlyRate: 4000 },
  { key: "knowledge_search", label: "Project Knowledge Search", category: "Core Intelligence", monthlyRate: 2500 },
  { key: "knowledge_graph", label: "Enterprise Knowledge Graph", category: "Core Intelligence", monthlyRate: 2500 },
  { key: "predictive_delays", label: "Predictive Delay Detection", category: "Analytics & Governance", monthlyRate: 3000 },
  { key: "meeting_diagnostics", label: "Meeting Failure Diagnostics", category: "Analytics & Governance", monthlyRate: 3000 },
  { key: "vulnerability_scanning", label: "Real-Time Vulnerability Scanning", category: "Analytics & Governance", monthlyRate: 2500 },
  { key: "api_access", label: "Developer REST API Access", category: "Connectivity & Integrations", monthlyRate: 2000 },
  { key: "webhooks", label: "Real-Time Webhooks", category: "Connectivity & Integrations", monthlyRate: 1500 },
  { key: "sso_saml", label: "Enterprise SSO & SAML 2.0", category: "Security & Access", monthlyRate: 3500 },
  { key: "rbac_advanced", label: "Custom Roles & Advanced Permissions", category: "Security & Access", monthlyRate: 2000 },
  { key: "ai_governance", label: "AI Governance & Audit Logs", category: "Security & Access", monthlyRate: 3000 },
  { key: "custom_integrations", label: "Custom Enterprise Integrations", category: "Connectivity & Integrations", monthlyRate: 3000 },
];

function bytesToGb(bytes?: number): number {
  if (bytes === undefined || bytes === null || bytes < 0) return -1;
  return Math.round(bytes / (1024 * 1024 * 1024));
}

function gbToBytes(gb: number): number {
  if (gb < 0) return -1;
  return gb * 1024 * 1024 * 1024;
}

function EnterpriseRequestsContent() {
  const [requests, setRequests] = useState<EnterpriseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<EnterpriseRequestItem | null>(null);

  // Review Modal State
  const [editUsers, setEditUsers] = useState<number>(50);
  const [unlimitedUsers, setUnlimitedUsers] = useState(false);
  const [editProjects, setEditProjects] = useState<number>(30);
  const [unlimitedProjects, setUnlimitedProjects] = useState(false);
  const [editStorageGb, setEditStorageGb] = useState<number>(100);
  const [unlimitedStorage, setUnlimitedStorage] = useState(false);
  const [editExecutions, setEditExecutions] = useState<number>(5000);
  const [unlimitedExecutions, setUnlimitedExecutions] = useState(false);
  const [editWorkflows, setEditWorkflows] = useState<number>(100);
  const [unlimitedWorkflows, setUnlimitedWorkflows] = useState(false);

  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  // Dynamic Live Price Calculation State
  const [priceBreakdown, setPriceBreakdown] = useState<any | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const searchParams = useSearchParams();
  const targetId = searchParams.get("id") || searchParams.get("request_id");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/enterprise-requests");
      setRequests(res.data.data || []);
    } catch (err: any) {
      console.error("Failed to load enterprise requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-open review modal when deep-linked from notification
  useEffect(() => {
    if (!targetId || requests.length === 0) return;
    const match = requests.find((r) => r.id === targetId);
    if (match) {
      openReviewModal(match);
    }
  }, [targetId, requests]);

  // Open review modal and initialize with request values
  const openReviewModal = (req: EnterpriseRequestItem) => {
    setSelectedRequest(req);
    setShowRejectBox(false);
    setRejectionReason("");
    setAdminNotes(req.admin_notes || "");

    const sourceResources = req.approved_resources || req.requested_resources || {};
    const maxU = sourceResources.max_users ?? 50;
    setUnlimitedUsers(maxU === -1);
    setEditUsers(maxU === -1 ? 100 : maxU);

    const maxP = sourceResources.max_projects ?? 30;
    setUnlimitedProjects(maxP === -1);
    setEditProjects(maxP === -1 ? 50 : maxP);

    const maxS = bytesToGb(sourceResources.max_storage_bytes);
    setUnlimitedStorage(maxS === -1);
    setEditStorageGb(maxS === -1 ? 250 : maxS);

    const maxE = sourceResources.max_ai_executions ?? 5000;
    setUnlimitedExecutions(maxE === -1);
    setEditExecutions(maxE === -1 ? 10000 : maxE);

    const maxW = sourceResources.max_automation_workflows ?? 100;
    setUnlimitedWorkflows(maxW === -1);
    setEditWorkflows(maxW === -1 ? 200 : maxW);

    const caps = req.approved_capabilities || req.requested_capabilities || [];
    setSelectedCapabilities([...caps]);

    if (req.price_breakdown) {
      setPriceBreakdown(req.price_breakdown);
    } else {
      recalculatePrice(
        maxU === -1 ? -1 : maxU,
        maxP === -1 ? -1 : maxP,
        maxS === -1 ? -1 : gbToBytes(maxS),
        maxE === -1 ? -1 : maxE,
        maxW === -1 ? -1 : maxW,
        caps
      );
    }
  };

  const recalculatePrice = async (
    users: number,
    projects: number,
    storage: number,
    executions: number,
    workflows: number,
    capabilities: string[]
  ) => {
    setPriceLoading(true);
    try {
      const res = await api.post("/admin/enterprise-requests/calculate-price", {
        resources: {
          max_users: users,
          max_projects: projects,
          max_storage_bytes: storage,
          max_ai_executions: executions,
          max_automation_workflows: workflows,
        },
        capabilities: capabilities,
      });
      setPriceBreakdown(res.data.data);
    } catch (err) {
      console.error("Failed to calculate enterprise price:", err);
    } finally {
      setPriceLoading(false);
    }
  };

  // Trigger recalculation on configuration change
  useEffect(() => {
    if (!selectedRequest || selectedRequest.status === "ACTIVATED" || selectedRequest.status === "PAYMENT_PENDING") {
      return;
    }
    const timer = setTimeout(() => {
      recalculatePrice(
        unlimitedUsers ? -1 : editUsers,
        unlimitedProjects ? -1 : editProjects,
        unlimitedStorage ? -1 : gbToBytes(editStorageGb),
        unlimitedExecutions ? -1 : editExecutions,
        unlimitedWorkflows ? -1 : editWorkflows,
        selectedCapabilities
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [
    unlimitedUsers,
    editUsers,
    unlimitedProjects,
    editProjects,
    unlimitedStorage,
    editStorageGb,
    unlimitedExecutions,
    editExecutions,
    unlimitedWorkflows,
    editWorkflows,
    selectedCapabilities,
  ]);

  const toggleCapability = (capKey: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capKey) ? prev.filter((k) => k !== capKey) : [...prev, capKey]
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const payload = {
        approved_resources: {
          max_users: unlimitedUsers ? -1 : editUsers,
          max_projects: unlimitedProjects ? -1 : editProjects,
          max_storage_bytes: unlimitedStorage ? -1 : gbToBytes(editStorageGb),
          max_ai_executions: unlimitedExecutions ? -1 : editExecutions,
          max_automation_workflows: unlimitedWorkflows ? -1 : editWorkflows,
        },
        approved_capabilities: selectedCapabilities,
        admin_notes: adminNotes,
      };
      const res = await api.post(`/admin/enterprise-requests/${selectedRequest.id}/approve`, payload);
      setFeedbackMessage({ type: "success", text: "Enterprise request approved! CTO notified to proceed to payment." });
      setSelectedRequest(res.data.data);
      fetchRequests();
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to approve request. Please check limits.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      setFeedbackMessage({ type: "error", text: "Please provide a rejection reason for the customer." });
      return;
    }
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/admin/enterprise-requests/${selectedRequest.id}/reject`, {
        reason: rejectionReason,
      });
      setFeedbackMessage({ type: "success", text: "Enterprise request rejected. Customer notified." });
      setSelectedRequest(res.data.data);
      fetchRequests();
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to reject request.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesSearch =
      r.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requester_email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      case "PAYMENT_PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <DollarSign className="w-3.5 h-3.5" /> Payment Pending
          </span>
        );
      case "ACTIVATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Activated
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <SuperAdminShell pageTitle="Enterprise Custom Subscription Requests">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Enterprise Custom Plan Requests
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Review custom enterprise resource quotas, capability tiers, calculate dynamic pricing, and approve custom subscription plans.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card hover:bg-accent text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border overflow-x-auto w-full md:w-auto">
            {["ALL", "PENDING", "PAYMENT_PENDING", "ACTIVATED", "REJECTED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === tab
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.replace("_", " ")}
                {tab === "PENDING" && requests.filter((r) => r.status === "PENDING").length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-500 font-bold">
                    {requests.filter((r) => r.status === "PENDING").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search company or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading enterprise requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">No Enterprise Requests Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {statusFilter !== "ALL"
                  ? `No requests currently in '${statusFilter}' status.`
                  : "No companies have submitted custom enterprise subscription requests yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-medium">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Requested Resources</th>
                    <th className="py-3 px-4">Capabilities</th>
                    <th className="py-3 px-4">Monthly Price</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((req) => {
                    const isTarget = targetId === req.id;
                    return (
                      <tr
                        key={req.id}
                        className={`transition-colors ${
                          isTarget ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/20"
                        }`}
                      >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{req.company_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{req.company_id.slice(0, 8)}...</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-foreground">{req.requester_name}</div>
                        <div className="text-[11px] text-muted-foreground">{req.requester_email}</div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                          <div>
                            <span className="text-foreground font-medium">
                              {req.requested_resources?.max_users === -1 ? "Unlimited" : req.requested_resources?.max_users || "Default"}
                            </span>{" "}
                            Users
                          </div>
                          <div>
                            <span className="text-foreground font-medium">
                              {req.requested_resources?.max_projects === -1 ? "Unlimited" : req.requested_resources?.max_projects || "Default"}
                            </span>{" "}
                            Projects
                          </div>
                          <div>
                            <span className="text-foreground font-medium">
                              {bytesToGb(req.requested_resources?.max_storage_bytes) === -1 ? "Unlimited" : `${bytesToGb(req.requested_resources?.max_storage_bytes)} GB`}
                            </span>{" "}
                            Storage
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground">
                          {req.requested_capabilities?.length || 0} enabled
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {req.calculated_price ? (
                          <div className="font-semibold text-foreground">
                            ₹{req.calculated_price.toLocaleString("en-IN")}
                            <span className="text-[10px] text-muted-foreground font-normal"> / mo</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Pending review</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openReviewModal(req)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs transition-colors"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Review & Approval Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">
                      Enterprise Plan Review: {selectedRequest.company_name}
                    </h2>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested by {selectedRequest.requester_name} ({selectedRequest.requester_email}) on{" "}
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scrollable */}
              <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-xs">
                {feedbackMessage && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      feedbackMessage.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {feedbackMessage.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedbackMessage.text}</span>
                  </div>
                )}

                {/* Business Justification */}
                {selectedRequest.business_justification && (
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                    <h4 className="font-semibold text-foreground text-xs mb-1">Business Requirements & Notes</h4>
                    <p className="text-muted-foreground text-xs leading-relaxed italic">
                      "{selectedRequest.business_justification}"
                    </p>
                  </div>
                )}

                {/* Section: Resource Quotas Configuration */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    1. Resource Quotas & Allocation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Users */}
                    <div className="p-3.5 rounded-lg border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-foreground flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Max Users / Seats
                        </label>
                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unlimitedUsers}
                            disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                            onChange={(e) => setUnlimitedUsers(e.target.checked)}
                            className="rounded border-border"
                          />
                          Unlimited
                        </label>
                      </div>
                      {!unlimitedUsers ? (
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={editUsers}
                          disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                          onChange={(e) => setEditUsers(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-primary py-1.5">Unlimited Capacity Included</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Requested: {selectedRequest.requested_resources?.max_users === -1 ? "Unlimited" : selectedRequest.requested_resources?.max_users}
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="p-3.5 rounded-lg border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-foreground flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary" /> Active Projects
                        </label>
                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unlimitedProjects}
                            disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                            onChange={(e) => setUnlimitedProjects(e.target.checked)}
                            className="rounded border-border"
                          />
                          Unlimited
                        </label>
                      </div>
                      {!unlimitedProjects ? (
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={editProjects}
                          disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                          onChange={(e) => setEditProjects(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-primary py-1.5">Unlimited Capacity Included</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Requested: {selectedRequest.requested_resources?.max_projects === -1 ? "Unlimited" : selectedRequest.requested_resources?.max_projects}
                      </div>
                    </div>

                    {/* Storage */}
                    <div className="p-3.5 rounded-lg border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-foreground flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-primary" /> Cloud Storage (GB)
                        </label>
                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unlimitedStorage}
                            disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                            onChange={(e) => setUnlimitedStorage(e.target.checked)}
                            className="rounded border-border"
                          />
                          Unlimited
                        </label>
                      </div>
                      {!unlimitedStorage ? (
                        <input
                          type="number"
                          min="10"
                          max="5000"
                          value={editStorageGb}
                          disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                          onChange={(e) => setEditStorageGb(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-primary py-1.5">Unlimited Capacity Included</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Requested: {bytesToGb(selectedRequest.requested_resources?.max_storage_bytes) === -1 ? "Unlimited" : `${bytesToGb(selectedRequest.requested_resources?.max_storage_bytes)} GB`}
                      </div>
                    </div>

                    {/* AI Executions */}
                    <div className="p-3.5 rounded-lg border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-foreground flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-primary" /> Monthly AI Executions
                        </label>
                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unlimitedExecutions}
                            disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                            onChange={(e) => setUnlimitedExecutions(e.target.checked)}
                            className="rounded border-border"
                          />
                          Unlimited
                        </label>
                      </div>
                      {!unlimitedExecutions ? (
                        <input
                          type="number"
                          min="500"
                          max="50000"
                          step="500"
                          value={editExecutions}
                          disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                          onChange={(e) => setEditExecutions(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-primary py-1.5">Unlimited Capacity Included</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Requested: {selectedRequest.requested_resources?.max_ai_executions === -1 ? "Unlimited" : selectedRequest.requested_resources?.max_ai_executions}
                      </div>
                    </div>

                    {/* Automation Workflows */}
                    <div className="p-3.5 rounded-lg border border-border bg-muted/10 space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-foreground flex items-center gap-1.5">
                          <Workflow className="w-3.5 h-3.5 text-primary" /> Automation Workflows
                        </label>
                        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unlimitedWorkflows}
                            disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                            onChange={(e) => setUnlimitedWorkflows(e.target.checked)}
                            className="rounded border-border"
                          />
                          Unlimited
                        </label>
                      </div>
                      {!unlimitedWorkflows ? (
                        <input
                          type="number"
                          min="10"
                          max="1000"
                          value={editWorkflows}
                          disabled={selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW"}
                          onChange={(e) => setEditWorkflows(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs"
                        />
                      ) : (
                        <div className="text-xs font-semibold text-primary py-1.5">Unlimited Capacity Included</div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        Requested: {selectedRequest.requested_resources?.max_automation_workflows === -1 ? "Unlimited" : selectedRequest.requested_resources?.max_automation_workflows}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Enterprise Capabilities */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    2. Product-Facing Enterprise Capabilities
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {CAPABILITY_DEFINITIONS.map((cap) => {
                      const isEnabled = selectedCapabilities.includes(cap.key);
                      const isRequested = selectedRequest.requested_capabilities?.includes(cap.key);
                      const isLocked = selectedRequest.status !== "PENDING" && selectedRequest.status !== "UNDER_REVIEW";
                      return (
                        <button
                          key={cap.key}
                          type="button"
                          disabled={isLocked}
                          onClick={() => toggleCapability(cap.key)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isEnabled
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "bg-muted/10 border-border text-muted-foreground opacity-75 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-start justify-between w-full">
                            <span className="font-semibold text-xs text-foreground">{cap.label}</span>
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 ${
                                isEnabled ? "bg-primary text-primary-foreground border-primary" : "border-border"
                              }`}
                            >
                              {isEnabled && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{cap.category}</span>
                            <span className="font-medium text-foreground">
                              +₹{cap.monthlyRate.toLocaleString("en-IN")}/mo
                            </span>
                          </div>
                          {isRequested && (
                            <div className="mt-1 text-[9px] text-primary font-medium">Customer requested</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Live Authoritative Dynamic Pricing Breakdown */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      3. Dynamic Enterprise Pricing Breakdown
                    </h3>
                    {priceLoading && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" /> Calculating...
                      </span>
                    )}
                  </div>

                  {priceBreakdown ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="text-[11px] text-muted-foreground">Base Platform Fee</div>
                          <div className="text-base font-bold text-foreground mt-0.5">
                            ₹{priceBreakdown.base_fee?.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Enterprise base quota</div>
                        </div>

                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="text-[11px] text-muted-foreground">Capabilities Fee</div>
                          <div className="text-base font-bold text-foreground mt-0.5">
                            ₹{priceBreakdown.capabilities_subtotal?.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {priceBreakdown.capabilities_items?.length || 0} features active
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-background border border-border">
                          <div className="text-[11px] text-muted-foreground">Resource Surcharges</div>
                          <div className="text-base font-bold text-foreground mt-0.5">
                            ₹{priceBreakdown.resources_subtotal?.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">High volume / unlimited</div>
                        </div>
                      </div>

                      {/* Itemized list */}
                      <div className="p-3 rounded-lg bg-background border border-border divide-y divide-border">
                        <div className="pb-2 text-[11px] font-semibold text-foreground">Itemized Monthly Cost</div>
                        {priceBreakdown.capabilities_items?.map((item: any) => (
                          <div key={item.key} className="py-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-medium text-foreground">
                              +₹{item.monthly_rate?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                        {priceBreakdown.resource_items?.map((item: any) => (
                          <div key={item.key} className="py-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium text-foreground">
                              +₹{item.surcharge?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 flex items-center justify-between font-bold text-sm text-foreground">
                          <span>Total Monthly Price</span>
                          <span className="text-emerald-500">
                            ₹{priceBreakdown.total_monthly_price?.toLocaleString("en-IN")} / month
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select capabilities and resources to view live pricing.</p>
                  )}
                </div>

                {/* Section: Admin Notes */}
                {(selectedRequest.status === "PENDING" || selectedRequest.status === "UNDER_REVIEW") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Admin Notes (Visible internally)</label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g., Approved with 50 seats and custom AI governance tier..."
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}

                {/* Rejection Box */}
                {showRejectBox && (
                  <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-2">
                    <label className="text-xs font-semibold text-rose-400">
                      Reason for Rejection (Customer will receive this in notification)
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g., Unable to fulfill requested unlimited storage quota at this time..."
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setShowRejectBox(false)}
                        className="px-3 py-1 rounded bg-muted text-muted-foreground text-xs hover:bg-muted/80"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                      >
                        {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Status: <span className="font-semibold text-foreground">{selectedRequest.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
                  >
                    Close
                  </button>

                  {(selectedRequest.status === "PENDING" || selectedRequest.status === "UNDER_REVIEW") && (
                    <>
                      {!showRejectBox && (
                        <button
                          type="button"
                          onClick={() => setShowRejectBox(true)}
                          className="px-4 py-2 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={actionLoading || priceLoading}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Approve Plan & Send Payment Link
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}

export default function EnterpriseRequestsPage() {
  return (
    <Suspense
      fallback={
        <SuperAdminShell pageTitle="Enterprise Requests">
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        </SuperAdminShell>
      }
    >
      <EnterpriseRequestsContent />
    </Suspense>
  );
}
