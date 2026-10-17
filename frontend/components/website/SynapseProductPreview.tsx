"use client";

import React, { useState } from "react";
import {
  Kanban,
  FileCheck2,
  GitBranch,
  Bot,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export function SynapseProductPreview() {
  const [activeTab, setActiveTab] = useState<"sprint" | "requirements" | "dependencies" | "ai">("sprint");

  return (
    <section id="preview" className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-10">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 text-xs font-mono uppercase tracking-wider text-primary mb-3">
            <Sparkles className="size-3" />
            <span>Interactive Workspace Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-[1.1] mb-3">
            A workspace that connects every layer.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Explore how Synapse unifies requirements, sprint planning, and contextual intelligence in one coherent interface.
          </p>
        </div>

        {/* WORKSPACE PRODUCT FRAME (Clean, credible software interface) */}
        <div className="relative rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xl shadow-black/5 dark:shadow-black/50 overflow-hidden">
          {/* Top Window Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-muted/30">
            {/* Window Dots & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-red-400/80" />
                <span className="size-3 rounded-full bg-amber-400/80" />
                <span className="size-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="text-foreground font-semibold">Synapse Workspace</span>
                <span>/</span>
                <span>Platform Engine v2.4</span>
                <span>/</span>
                <span className="text-primary font-medium">Sprint 24</span>
              </div>
            </div>

            {/* Interactive Mode Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/80 rounded-xl border border-border/60">
              <button
                onClick={() => setActiveTab("sprint")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "sprint"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Kanban className="size-3.5" />
                <span>Sprint Board</span>
              </button>

              <button
                onClick={() => setActiveTab("requirements")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "requirements"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileCheck2 className="size-3.5" />
                <span>Requirements Radar</span>
              </button>

              <button
                onClick={() => setActiveTab("dependencies")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "dependencies"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitBranch className="size-3.5" />
                <span>Dependency Graph</span>
              </button>

              <button
                onClick={() => setActiveTab("ai")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === "ai"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="size-3.5 text-primary" />
                <span>Context AI</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SPRINT BOARD & BACKLOG */}
          {activeTab === "sprint" && (
            <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Sprint 24 — Authentication & Core Sync</h3>
                    <p className="text-xs text-muted-foreground">Oct 14 - Oct 28 • 14 days • 78% Story Points Resolved</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    Velocity: +14%
                  </span>
                </div>
              </div>

              {/* 3 Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Column 1: In Progress */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500" />
                      In Progress (3)
                    </span>
                    <span className="text-muted-foreground">18 pts</span>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-muted-foreground">#SYN-204</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        HIGH
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-2">OAuth2 Token Refresh Cascade</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Assigned: Alex R.</span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="size-3" /> PR #88
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-muted-foreground">#SYN-209</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                        MEDIUM
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-2">Context Knowledge Retrieval Cache</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Assigned: Priya N.</span>
                      <span>Review Stage</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Code Review & Verification */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary" />
                      AI Verified (2)
                    </span>
                    <span className="text-muted-foreground">12 pts</span>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-muted-foreground">#SYN-198</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-2">Meeting Transcript Entity Extractor</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Linked: REQ-104</span>
                      <span className="text-xs text-primary font-mono">100% test pass</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Ready for Release */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Completed (5)
                    </span>
                    <span className="text-muted-foreground">24 pts</span>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-muted-foreground">#SYN-182</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        RELEASED
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mb-2">Workspace Dual Theme Tokens & Palette</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Merged to main</span>
                      <span className="text-emerald-600">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REQUIREMENTS RADAR */}
          {activeTab === "requirements" && (
            <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    AI-Assisted Requirement Checker — Spec #REQ-219
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Automated contextual scan against project history, architecture docs, and meeting decisions.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                  3 of 4 Criteria Verified
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Criterion 1: Sub-second Semantic Search</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verified against indexing benchmarks (avg 180ms response across 50k project documents).
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Criterion 2: Ambiguity Detected in SSO Expiry</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Spec assumes instant token revoking, but architecture doc Section 4.2 specifies 5-minute cache TTL.
                      Recommendation: Align with RFC 6749 refresh pattern.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Criterion 3: Human Verification Gate</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI decisions require human approval before task status is modified. Verified in code review PR #44.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEPENDENCY GRAPH */}
          {activeTab === "dependencies" && (
            <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    Dependency Trace & Delay Predictor
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Interconnected dependency chain mapped across sprint tasks and external PRs.
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-primary">Trace Confidence: 98%</span>
              </div>

              {/* Chain Steps */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Step 01 • Origin</span>
                  <p className="text-xs font-bold text-foreground mt-1">API Schema v2.4</p>
                  <span className="inline-block mt-2 text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                    COMPLETED
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Step 02 • Core PR</span>
                  <p className="text-xs font-bold text-foreground mt-1">Auth Bridge #88</p>
                  <span className="inline-block mt-2 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                    IN REVIEW
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-amber-500/30 bg-amber-500/5 shadow-2xs">
                  <span className="text-[10px] font-mono text-amber-600 uppercase">Step 03 • Downstream</span>
                  <p className="text-xs font-bold text-foreground mt-1">Mobile Token Sync</p>
                  <span className="inline-block mt-2 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
                    BLOCKED ON PR #88
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Step 04 • Release</span>
                  <p className="text-xs font-bold text-foreground mt-1">Sprint 24 Cut</p>
                  <span className="inline-block mt-2 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                    SCHEDULED OCT 28
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONTEXT AI QUERY */}
          {activeTab === "ai" && (
            <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Contextual AI Project Assistant
                </h3>
                <p className="text-xs text-muted-foreground">
                  Queries your team&apos;s live Jira, PRs, meeting transcripts, and requirements in real time.
                </p>
              </div>

              {/* Sample Query & Answer */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border mb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-primary mb-2">
                  <Bot className="size-4" />
                  <span>Synthesized Project Query:</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-foreground bg-card p-3 rounded-lg border border-border mb-3">
                  “Are there any unaddressed dependencies between Sprint 24 auth changes and the client SDK?”
                </p>

                <div className="p-3.5 rounded-lg bg-card/80 border border-primary/20 text-xs text-foreground space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Sparkles className="size-3.5" />
                    <span>Context-Verified Answer:</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Yes. PR #88 updates the refresh token rotation mechanism. While backend specs are complete, Mobile Token Sync (#SYN-204) is currently awaiting API contract sign-off from Alex R.
                  </p>
                  <div className="text-[11px] font-mono text-muted-foreground pt-1 flex gap-3">
                    <span>Source 1: Meeting Oct 12</span>
                    <span>Source 2: REQ-219</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
