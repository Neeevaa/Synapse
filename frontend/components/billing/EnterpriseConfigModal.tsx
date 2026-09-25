"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  Server,
  Users,
  FolderKanban,
  HardDrive,
  Cpu,
  Workflow,
  Check,
  HelpCircle,
} from "lucide-react";

export interface EnterpriseLimits {
  max_users: number;
  max_active_projects: number;
  max_storage_gb: number;
  max_ai_executions: number;
  max_automation_workflows: number;
}

export interface EnterpriseCapabilityOption {
  key: string;
  name: string;
  category: string;
  description: string;
}

export const ENTERPRISE_CAPABILITIES: EnterpriseCapabilityOption[] = [
  {
    key: "AI Agents",
    name: "AI Agents",
    category: "Autonomous Intelligence",
    description: "Autonomous agents for backlog grooming, sprint breakdown, and smart task coordination.",
  },
  {
    key: "Project Knowledge Search",
    name: "Project Knowledge Search",
    category: "Knowledge & Context",
    description: "Deep contextual semantic search across all team project documents, requirements, and discussions.",
  },
  {
    key: "Knowledge Graph",
    name: "Knowledge Graph",
    category: "Knowledge & Context",
    description: "Automated relationship map connecting cross-project dependencies, assets, and milestones.",
  },
  {
    key: "Predictive Delay Detection",
    name: "Predictive Delay Detection",
    category: "Project Intelligence",
    description: "Foresight engine anticipating sprint blockers and deadline slippages before they occur.",
  },
  {
    key: "Contextual Delay Diagnostics",
    name: "Contextual Delay Diagnostics",
    category: "Project Intelligence",
    description: "Root-cause diagnostics pinpointing engineering bottlenecks and workload friction.",
  },
  {
    key: "Requirement Vulnerability Scanning",
    name: "Requirement Vulnerability Scanning",
    category: "Quality & Security",
    description: "Automated ambiguity and compliance vulnerability scanning for PRDs and technical specs.",
  },
  {
    key: "API Access",
    name: "API Access",
    category: "Developer Platform",
    description: "High-throughput REST API access with custom rate limits and automated developer credentials.",
  },
  {
    key: "Webhooks",
    name: "Webhooks",
    category: "Developer Platform",
    description: "Real-time webhook subscriptions for task state transitions, reviews, and intelligence triggers.",
  },
  {
    key: "SSO / SAML",
    name: "SSO / SAML",
    category: "Enterprise Security",
    description: "Enterprise single sign-on supporting Okta, Azure AD, Google Workspace, and SAML 2.0.",
  },
  {
    key: "Advanced RBAC",
    name: "Advanced RBAC",
    category: "Enterprise Security",
    description: "Custom organizational roles, fine-grained project permissions, and domain segregation.",
  },
  {
    key: "Advanced AI Governance",
    name: "Advanced AI Governance",
    category: "Compliance & Governance",
    description: "Audit logging of all AI queries, prompt review controls, and strict compliance boundaries.",
  },
  {
    key: "Custom Integrations",
    name: "Custom Integrations",
    category: "Developer Platform",
    description: "Dedicated custom pipeline connectors for Jira, GitHub, Slack, and internal tools.",
  },
];

export interface EnterpriseConfigInitialValues {
  max_users?: number;
  max_projects?: number;
  max_storage_bytes?: number;
  max_ai_executions?: number;
  max_automation_workflows?: number;
  capabilities?: string[];
  business_justification?: string;
}

export interface EnterpriseConfigSubmitData {
  requested_resources: {
    max_users: number;
    max_projects: number;
    max_storage_bytes: number;
    max_ai_executions: number;
    max_automation_workflows: number;
  };
  requested_capabilities: string[];
  business_justification?: string;
  limits?: EnterpriseLimits;
  requested_reason?: string;
}

export interface EnterpriseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: EnterpriseConfigSubmitData) => void;
  initialValues?: EnterpriseConfigInitialValues;
  isSubmitting?: boolean;
}

export default function EnterpriseConfigModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting = false,
}: EnterpriseConfigModalProps) {
  // Section 1: Resource Limits (-1 = unlimited)
  const initUsers = initialValues?.max_users ?? -1;
  const [unlimitedUsers, setUnlimitedUsers] = useState(initUsers === -1);
  const [usersCount, setUsersCount] = useState(initUsers === -1 ? 100 : initUsers);

  const initProjects = initialValues?.max_projects ?? -1;
  const [unlimitedProjects, setUnlimitedProjects] = useState(initProjects === -1);
  const [projectsCount, setProjectsCount] = useState(initProjects === -1 ? 50 : initProjects);

  const initStorageBytes = initialValues?.max_storage_bytes ?? 100 * 1024 * 1024 * 1024;
  const initStorageGb = initStorageBytes === -1 ? -1 : Math.round(initStorageBytes / (1024 * 1024 * 1024));
  const [unlimitedStorage, setUnlimitedStorage] = useState(initStorageGb === -1);
  const [storageGb, setStorageGb] = useState(initStorageGb === -1 ? 100 : initStorageGb);

  const initAi = initialValues?.max_ai_executions ?? -1;
  const [unlimitedAi, setUnlimitedAi] = useState(initAi === -1);
  const [aiExecs, setAiExecs] = useState(initAi === -1 ? 5000 : initAi);

  const initWorkflows = initialValues?.max_automation_workflows ?? -1;
  const [unlimitedAutomations, setUnlimitedAutomations] = useState(initWorkflows === -1);
  const [automationsCount, setAutomationsCount] = useState(initWorkflows === -1 ? 50 : initWorkflows);

  // Section 2: Enterprise Capabilities
  const defaultCaps = [
    "AI Agents",
    "Project Knowledge Search",
    "Knowledge Graph",
    "API Access",
    "Advanced RBAC",
    "SSO / SAML",
  ];
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(
    initialValues?.capabilities || defaultCaps
  );

  // Section 3: Reason
  const [reason, setReason] = useState(initialValues?.business_justification || "");

  if (!isOpen) return null;

  const toggleCapability = (key: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUsers = unlimitedUsers ? -1 : Math.max(1, Number(usersCount) || 1);
    const finalProjects = unlimitedProjects ? -1 : Math.max(1, Number(projectsCount) || 1);
    const finalStorageGb = unlimitedStorage ? -1 : Math.max(1, Number(storageGb) || 1);
    const finalStorageBytes = finalStorageGb === -1 ? -1 : finalStorageGb * 1024 * 1024 * 1024;
    const finalAi = unlimitedAi ? -1 : Math.max(1, Number(aiExecs) || 1);
    const finalWorkflows = unlimitedAutomations ? -1 : Math.max(1, Number(automationsCount) || 1);

    const limits: EnterpriseLimits = {
      max_users: finalUsers,
      max_active_projects: finalProjects,
      max_storage_gb: finalStorageGb,
      max_ai_executions: finalAi,
      max_automation_workflows: finalWorkflows,
    };

    onSubmit({
      requested_resources: {
        max_users: finalUsers,
        max_projects: finalProjects,
        max_storage_bytes: finalStorageBytes,
        max_ai_executions: finalAi,
        max_automation_workflows: finalWorkflows,
      },
      requested_capabilities: selectedCapabilities,
      business_justification: reason.trim() || undefined,
      limits,
      requested_reason: reason.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 text-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-3.5" /> Custom Enterprise Plan
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Configure Your Custom Enterprise Scale
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Specify the operational capacity and advanced capabilities needed for your organization.
            Our team will review your specifications, prepare an authoritative plan proposal, and notify you when ready.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* SECTION 1: RESOURCE LIMITS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                Section 1 — Resource Limits
              </span>
              <span className="text-[11px] text-muted-foreground">
                Toggle Unlimited (-1) or set explicit capacity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Max Users */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Users className="size-4 text-primary" /> Maximum Users
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedUsers}
                      onChange={(e) => setUnlimitedUsers(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                {!unlimitedUsers ? (
                  <input
                    type="number"
                    min="1"
                    value={usersCount}
                    onChange={(e) => setUsersCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    placeholder="e.g. 100"
                  />
                ) : (
                  <div className="text-[11px] font-extrabold text-primary px-2 py-1 rounded bg-primary/10 inline-block">
                    Unlimited Active Seats (-1)
                  </div>
                )}
              </div>

              {/* Max Active Projects */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <FolderKanban className="size-4 text-primary" /> Maximum Active Projects
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedProjects}
                      onChange={(e) => setUnlimitedProjects(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                {!unlimitedProjects ? (
                  <input
                    type="number"
                    min="1"
                    value={projectsCount}
                    onChange={(e) => setProjectsCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    placeholder="e.g. 50"
                  />
                ) : (
                  <div className="text-[11px] font-extrabold text-primary px-2 py-1 rounded bg-primary/10 inline-block">
                    Unlimited Projects (-1)
                  </div>
                )}
              </div>

              {/* Max Storage (GB) */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <HardDrive className="size-4 text-primary" /> Storage (GB)
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedStorage}
                      onChange={(e) => setUnlimitedStorage(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                {!unlimitedStorage ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={storageGb}
                      onChange={(e) => setStorageGb(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                      placeholder="e.g. 100"
                    />
                    <span className="text-xs text-muted-foreground font-semibold">GB</span>
                  </div>
                ) : (
                  <div className="text-[11px] font-extrabold text-primary px-2 py-1 rounded bg-primary/10 inline-block">
                    Unlimited Storage (-1)
                  </div>
                )}
              </div>

              {/* Monthly AI Executions */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Cpu className="size-4 text-primary" /> Monthly AI Executions
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedAi}
                      onChange={(e) => setUnlimitedAi(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                {!unlimitedAi ? (
                  <input
                    type="number"
                    min="1"
                    value={aiExecs}
                    onChange={(e) => setAiExecs(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    placeholder="e.g. 5000"
                  />
                ) : (
                  <div className="text-[11px] font-extrabold text-primary px-2 py-1 rounded bg-primary/10 inline-block">
                    Unlimited AI Executions (-1)
                  </div>
                )}
              </div>

              {/* Automation Workflows */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Workflow className="size-4 text-primary" /> Maximum Automation Workflows
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedAutomations}
                      onChange={(e) => setUnlimitedAutomations(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-3.5"
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                {!unlimitedAutomations ? (
                  <input
                    type="number"
                    min="1"
                    value={automationsCount}
                    onChange={(e) => setAutomationsCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    placeholder="e.g. 50"
                  />
                ) : (
                  <div className="text-[11px] font-extrabold text-primary px-2 py-1 rounded bg-primary/10 inline-block">
                    Unlimited Automation Workflows (-1)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: ENTERPRISE CAPABILITIES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                Section 2 — Enterprise Capabilities
              </span>
              <span className="text-[11px] text-muted-foreground">
                {selectedCapabilities.length} of {ENTERPRISE_CAPABILITIES.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {ENTERPRISE_CAPABILITIES.map((cap) => {
                const isChecked = selectedCapabilities.includes(cap.key);
                return (
                  <div
                    key={cap.key}
                    onClick={() => toggleCapability(cap.key)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                      isChecked
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`size-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/50 bg-background"
                      }`}
                    >
                      {isChecked && <Check className="size-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          {cap.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {cap.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: REASON FOR REQUEST */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reason for Request / Additional Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scaling engineering division across 3 locations; requiring custom governance and single sign-on."
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none leading-relaxed"
            />
          </div>

          {/* REVIEW NOTICE */}
          <div className="flex items-start gap-2.5 rounded-xl bg-primary/10 border border-primary/20 p-3 text-[11px] text-foreground leading-relaxed">
            <ShieldCheck className="size-4 shrink-0 mt-0.5 text-primary" />
            <div>
              <strong>Enterprise Review Process:</strong> Submitting this request places your specifications under review.
              Our platform administrator will review your requirements, determine the authoritative monthly subscription price, and notify you.
              <strong> No payment is charged at this time.</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>Submit Enterprise Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
