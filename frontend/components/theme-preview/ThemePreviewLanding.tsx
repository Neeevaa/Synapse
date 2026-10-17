'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Kanban,
  FileCheck2,
  GitBranch,
  Bot,
  Check,
} from 'lucide-react';
import { PlaceholderImageFrame } from './PlaceholderImageFrame';

interface ThemePreviewLandingProps {
  theme: 'light' | 'dark';
}

export function ThemePreviewLanding({ theme }: ThemePreviewLandingProps) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'sprint' | 'requirements' | 'dependencies' | 'ai'>('sprint');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    { num: '01', title: 'Organize Living Specs', desc: 'Ingest PRDs, briefs, and client notes into structured acceptance criteria.' },
    { num: '02', title: 'Balance Sprint Capacity', desc: 'Break epics into atomic tasks with historical velocity calibration.' },
    { num: '03', title: 'Map Blast Radius', desc: 'Visualize cross-team blockers and API dependencies before merges stall.' },
    { num: '04', title: 'Context-Aware AI', desc: 'Proactively flag delivery slips, stale reviews, and scope creep.' },
    { num: '05', title: 'Lead-Approved Releases', desc: 'Engineers maintain full oversight—every AI suggestion requires explicit sign-off.' },
  ];

  return (
    <div className="synapse-theme-preview" data-theme={theme}>
      {/* 1. NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--tp-bg-canvas)]/90 border-b border-[var(--tp-border-subtle)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] flex items-center justify-center font-bold text-sm shadow-sm">
              S
            </span>
            <span className="font-bold text-lg tracking-tight text-[var(--tp-text-primary)]">
              Synapse
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--tp-sand-surface)] text-[var(--tp-sand-text)] border border-[var(--tp-border-subtle)]">
              {theme.toUpperCase()} PREVIEW
            </span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--tp-text-secondary)]">
            <a href="#overview" className="hover:text-[var(--tp-brand-primary)] transition-colors">Overview</a>
            <a href="#workspace" className="hover:text-[var(--tp-brand-primary)] transition-colors">Workspace</a>
            <a href="#requirements" className="hover:text-[var(--tp-brand-primary)] transition-colors">Requirements</a>
            <a href="#sprints" className="hover:text-[var(--tp-brand-primary)] transition-colors">Sprints</a>
            <a href="#dependencies" className="hover:text-[var(--tp-brand-primary)] transition-colors">Dependencies</a>
            <a href="#pricing" className="hover:text-[var(--tp-brand-primary)] transition-colors">Pricing</a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-[var(--tp-text-secondary)] hover:text-[var(--tp-text-primary)] px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] hover:opacity-90 shadow-sm transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section id="overview" className="relative py-16 md:py-24 px-4 md:px-8 overflow-hidden">
        {/* Subtle decorative glow in theme tones */}
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: theme === 'light' ? '#790D16' : '#790D16' }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Eyebrow Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] border border-[var(--tp-border-subtle)] text-[var(--tp-sand-text)] mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
            <span>AI-POWERED PROJECT COORDINATION</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--tp-text-primary)] leading-[1.1] max-w-4xl mx-auto">
            Project Management That Thinks Ahead.
          </h1>

          {/* Supporting Text */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-[var(--tp-text-secondary)] max-w-3xl mx-auto leading-relaxed">
            Synapse brings project requirements, tasks, sprints, team coordination, and AI-powered insights into one connected workspace—helping teams identify risks, understand dependencies, and make better-informed decisions.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] text-sm font-bold shadow-md hover:opacity-95 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#workspace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)] text-sm font-semibold text-[var(--tp-text-primary)] hover:border-[var(--tp-border-focus)] transition-all"
            >
              Explore Synapse
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--tp-text-muted)] font-mono">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" /> 100% Traceability
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" /> Multi-Tenant Isolation
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" /> Local Neural Ollama
            </span>
          </div>
        </div>

        {/* 3. HERO PRODUCT PREVIEW (WITH PLACEHOLDER IMAGE & INTERACTIVE TAB SWITCHER) */}
        <div id="workspace" className="max-w-6xl mx-auto mt-14">
          <PlaceholderImageFrame
            imagePath="/images/website/hero-workspace-mockup.svg"
            alt="Synapse Workspace Mockup"
            width={1200}
            height={675}
            label="hero-workspace-mockup.svg"
            description="High-resolution hero product interface showcasing the sprint board, health metrics, and living PRD status."
            interactiveComponent={
              <div className="space-y-4">
                {/* Tab selector */}
                <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[var(--tp-border-subtle)]">
                  {[
                    { id: 'sprint', label: 'Sprint Board', icon: Kanban },
                    { id: 'requirements', label: 'Requirements Radar', icon: FileCheck2 },
                    { id: 'dependencies', label: 'Dependency Graph', icon: GitBranch },
                    { id: 'ai', label: 'Context AI Query', icon: Bot },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeWorkspaceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveWorkspaceTab(tab.id as typeof activeWorkspaceTab)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] shadow-sm'
                            : 'bg-[var(--tp-bg-surface)] text-[var(--tp-text-secondary)] hover:text-[var(--tp-text-primary)] border border-[var(--tp-border-subtle)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content Display */}
                <div className="p-4 rounded-xl bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)]">
                  {activeWorkspaceTab === 'sprint' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)]">
                        <div className="font-bold text-[var(--tp-text-primary)] mb-1">To Do (4)</div>
                        <div className="p-2 rounded bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)] mb-2">
                          <div className="font-medium text-[var(--tp-text-primary)]">SYN-104: Tenant Isolation Tests</div>
                          <div className="text-[10px] text-[var(--tp-text-muted)] mt-1">3 pts • Unassigned</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--tp-bg-card-nested)] border border-[var(--tp-brand-primary)]">
                        <div className="font-bold text-[var(--tp-brand-primary)] mb-1">In Progress (3)</div>
                        <div className="p-2 rounded bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)] mb-2">
                          <div className="font-medium text-[var(--tp-text-primary)]">SYN-108: OAuth Refresh Queue</div>
                          <div className="text-[10px] text-[var(--tp-brand-primary)] font-semibold mt-1">5 pts • In Review</div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)]">
                        <div className="font-bold text-[var(--tp-text-primary)] mb-1">Done (8)</div>
                        <div className="p-2 rounded bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)] mb-2">
                          <div className="font-medium text-[var(--tp-text-primary)]">SYN-099: FastAPI Health Endpoint</div>
                          <div className="text-[10px] text-emerald-600 font-semibold mt-1">2 pts • Verified</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeWorkspaceTab === 'requirements' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)]">
                        <span className="font-semibold text-[var(--tp-text-primary)]">PRD-2026-v2: Multi-Tenant Architecture</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">94% COMPLETE</span>
                      </div>
                      <div className="p-2.5 rounded bg-[var(--tp-dusty-blue-surface)] border border-[var(--tp-dusty-blue-border)] text-[var(--tp-dusty-blue-text)]">
                        AI Insight: 2 edge cases lack explicit session token refresh timeouts under high-concurrency bursts.
                      </div>
                    </div>
                  )}

                  {activeWorkspaceTab === 'dependencies' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)]">
                        <div className="font-bold text-[var(--tp-text-primary)]">Critical Path Dependency</div>
                        <div className="text-[11px] text-[var(--tp-text-secondary)] mt-1">
                          Auth API Gateway (PR #142) → Billing Service Contract (v2.1) → Client SDK
                        </div>
                        <div className="mt-2 text-[10px] font-mono text-[var(--tp-brand-primary)]">
                          Estimated Delay Risk: Low • Blocking PR merged 22m ago
                        </div>
                      </div>
                    </div>
                  )}

                  {activeWorkspaceTab === 'ai' && (
                    <div className="p-3 rounded bg-[var(--tp-dusty-blue-surface)] border border-[var(--tp-dusty-blue-border)] text-xs text-[var(--tp-dusty-blue-text)] space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
                        <span>Natural Language Synthesis</span>
                      </div>
                      <p className="italic">
                        &quot;Sprint 24 capacity is currently balanced at 86%. Friday release cutoff remains on schedule with zero unaddressed PR blockers.&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </section>

      {/* 4. AI REQUIREMENT-REVIEW FINDINGS SECTION */}
      <section id="requirements" className="py-16 px-4 md:px-8 border-t border-[var(--tp-border-subtle)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] border border-[var(--tp-border-subtle)] text-[var(--tp-sand-text)]">
                <FileCheck2 className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
                <span>REQUIREMENT AUDITOR</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--tp-text-primary)]">
                Living Specs That Cross-Check Reality
              </h2>
              <p className="text-sm text-[var(--tp-text-secondary)] leading-relaxed">
                Static PRDs quickly drift from actual code commits. Synapse continuously cross-references functional specifications against pull requests and tests, detecting missing edge cases before code merges.
              </p>
              <ul className="space-y-2.5 text-xs text-[var(--tp-text-secondary)] pt-2">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Automated ambiguity & testability scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>Direct links to acceptance criteria test suites</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>100% audit traceability back to business goals</span>
                </li>
              </ul>
            </div>

            {/* Right Placeholder Image */}
            <div className="lg:col-span-7">
              <PlaceholderImageFrame
                imagePath="/images/website/requirements-analysis-card.svg"
                alt="Requirements Analysis Card"
                width={800}
                height={500}
                label="requirements-analysis-card.svg"
                description="Shows PRD quality score, parsed acceptance criteria, and edge-case warnings."
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. SPRINT PROGRESS & VELOCITY SECTION */}
      <section id="sprints" className="py-16 px-4 md:px-8 border-t border-[var(--tp-border-subtle)] bg-[var(--tp-bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Placeholder Image */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <PlaceholderImageFrame
                imagePath="/images/website/sprint-burndown-board.svg"
                alt="Sprint Burndown Board"
                width={800}
                height={500}
                label="sprint-burndown-board.svg"
                description="Real-time burn-down velocity curve, team capacity load, and milestone ETA."
              />
            </div>

            {/* Right Narrative */}
            <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] border border-[var(--tp-border-subtle)] text-[var(--tp-sand-text)]">
                <Kanban className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
                <span>DYNAMIC SPRINT PLANNING</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--tp-text-primary)]">
                Balanced Sprints Without Burnout
              </h2>
              <p className="text-sm text-[var(--tp-text-secondary)] leading-relaxed">
                Rather than relying on flat story-point averages, Synapse models individual code ownership, review turnarounds, and on-call rotations to distribute workload equitably across your team.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)]">
                  <div className="text-[10px] text-[var(--tp-text-muted)] uppercase">Burn-Down Status</div>
                  <div className="text-base font-bold text-[var(--tp-text-primary)] mt-0.5">4 pts ahead</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)]">
                  <div className="text-[10px] text-[var(--tp-text-muted)] uppercase">Team Capacity</div>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">85% Balanced</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DEPENDENCY & BLAST RADIUS SECTION */}
      <section id="dependencies" className="py-16 px-4 md:px-8 border-t border-[var(--tp-border-subtle)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] border border-[var(--tp-border-subtle)] text-[var(--tp-sand-text)]">
                <GitBranch className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
                <span>DEPENDENCY REASONING</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--tp-text-primary)]">
                Visualize Cross-Team Blockers Early
              </h2>
              <p className="text-sm text-[var(--tp-text-secondary)] leading-relaxed">
                Never get surprised by an unmerged upstream API contract mid-sprint. Synapse graphs technical dependencies, schema migrations, and review chains so every lead sees the downstream impact of code delays.
              </p>
              <div className="p-3.5 rounded-xl bg-[var(--tp-dusty-blue-surface)] border border-[var(--tp-dusty-blue-border)] text-xs text-[var(--tp-dusty-blue-text)]">
                <strong>Blast Radius Preview:</strong> Modifying PR #142 affects 2 downstream consumers. Synapse notifies affected engineers in advance.
              </div>
            </div>

            {/* Right Placeholder Image */}
            <div className="lg:col-span-7">
              <PlaceholderImageFrame
                imagePath="/images/website/dependency-graph-visual.svg"
                alt="Dependency Graph Visual"
                width={800}
                height={500}
                label="dependency-graph-visual.svg"
                description="Interactive dependency graph mapping API contracts, blocking PRs, and critical paths."
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. AI CONTEXT ASSISTANT & TRACEABILITY BENTO */}
      <section className="py-16 px-4 md:px-8 border-t border-[var(--tp-border-subtle)] bg-[var(--tp-bg-surface)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] border border-[var(--tp-border-subtle)] text-[var(--tp-sand-text)] mb-3">
              <Bot className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
              <span>CONTEXTUAL INTELLIGENCE</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--tp-text-primary)]">
              Unified Project Knowledge &amp; Traceability
            </h2>
            <p className="mt-3 text-sm text-[var(--tp-text-secondary)]">
              Search across commits, PRDs, Jira tickets, and meeting summaries using natural language with verifiable source citations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlaceholderImageFrame
              imagePath="/images/website/ai-context-assistant.svg"
              alt="AI Context Assistant"
              width={800}
              height={500}
              label="ai-context-assistant.svg"
              description="Natural-language project Q&A with verifiable Slack, Jira, and GitHub commit citations."
            />

            <PlaceholderImageFrame
              imagePath="/images/website/feature-traceability-bento.svg"
              alt="Feature Traceability Bento"
              width={800}
              height={500}
              label="feature-traceability-bento.svg"
              description="End-to-end traceability linking business requirements to pull requests and deployment."
            />
          </div>
        </div>
      </section>

      {/* 8. HOW SYNAPSE WORKS (5-STEP WORKFLOW) */}
      <section className="py-16 px-4 md:px-8 border-t border-[var(--tp-border-subtle)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--tp-text-primary)]">
              The Connected Synapse Workflow
            </h2>
            <p className="mt-2 text-sm text-[var(--tp-text-secondary)]">
              Five continuous stages turning complex product initiatives into on-time, predictable releases.
            </p>
          </div>

          {/* Step Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {workflowSteps.map((s, idx) => {
              const isSelected = idx === activeWorkflowStep;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setActiveWorkflowStep(idx)}
                  className={`p-4 rounded-xl text-left transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--tp-bg-card-nested)] border-[var(--tp-brand-primary)] shadow-md'
                      : 'bg-[var(--tp-bg-surface)] border-[var(--tp-border-subtle)] hover:border-[var(--tp-border-strong)]'
                  }`}
                >
                  <div className="text-xl font-extrabold text-[var(--tp-brand-primary)]">{s.num}</div>
                  <div className="text-xs font-bold text-[var(--tp-text-primary)] mt-1">{s.title}</div>
                  <div className="text-[11px] text-[var(--tp-text-secondary)] mt-1.5 leading-relaxed">
                    {s.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. TRANSPARENT PRICING PREVIEW */}
      <section id="pricing" className="py-16 px-4 md:px-8 border-t border-[var(--tp-border-subtle)] bg-[var(--tp-bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] border border-[var(--tp-border-subtle)] text-[var(--tp-sand-text)] mb-3">
              <span>SUBSCRIPTION PLANS</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--tp-text-primary)]">
              Transparent, Scalable Pricing
            </h2>
            <p className="mt-2 text-sm text-[var(--tp-text-secondary)]">
              Authored directly from Synapse&apos;s authoritative subscription system.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Free', price: '₹0', period: 'forever free', desc: 'For individuals & small teams exploring Synapse', cta: 'Select Free', popular: false },
              { name: 'Starter', price: '₹799', period: '/ month', desc: 'For growing teams managing up to 10 projects', cta: 'Select Starter', popular: false },
              { name: 'Pro', price: '₹1,999', period: '/ month', desc: 'Full AI project intelligence & risk detection', cta: 'Select Pro', popular: true },
              { name: 'Enterprise', price: 'Custom', period: 'tailored SLAs', desc: 'Dedicated VPC, SSO, and audit compliance', cta: 'Contact Sales', popular: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all ${
                  p.popular
                    ? 'bg-[var(--tp-bg-card-nested)] border-2 border-[var(--tp-brand-primary)] shadow-lg scale-105 z-10'
                    : 'bg-[var(--tp-bg-card-nested)] border-[var(--tp-border-subtle)]'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] text-[10px] font-bold tracking-wider uppercase">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-[var(--tp-text-primary)]">{p.name}</div>
                  <div className="text-xs text-[var(--tp-text-secondary)] mt-1 min-h-[32px]">{p.desc}</div>
                  <div className="mt-4 pb-4 border-b border-[var(--tp-border-subtle)]">
                    <span className="text-3xl font-extrabold text-[var(--tp-text-primary)]">{p.price}</span>
                    <span className="text-xs text-[var(--tp-text-muted)] ml-1">{p.period}</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-[var(--tp-text-secondary)]">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Sprint Management</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> AI Requirement Review</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Dependency Graph</li>
                  </ul>
                </div>
                <div className="mt-6 pt-2">
                  <Link
                    href="/register"
                    className={`w-full inline-flex items-center justify-center py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                      p.popular
                        ? 'bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] hover:opacity-90 shadow-sm'
                        : 'bg-[var(--tp-bg-surface)] text-[var(--tp-text-primary)] border border-[var(--tp-border-subtle)] hover:border-[var(--tp-border-focus)]'
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FINAL CALL TO ACTION */}
      <section className="py-20 px-4 md:px-8 border-t border-[var(--tp-border-subtle)]">
        <div className="max-w-4xl mx-auto text-center p-8 md:p-14 rounded-3xl bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)] shadow-xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--tp-sand-surface)] text-[var(--tp-sand-text)] border border-[var(--tp-border-subtle)] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[var(--tp-brand-primary)]" />
            <span>ACCELERATE YOUR TEAM</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--tp-text-primary)]">
            Bring Your Projects Into Focus.
          </h2>

          <p className="mt-4 text-base md:text-lg text-[var(--tp-text-secondary)] max-w-2xl mx-auto">
            Connect your team&apos;s work, understand the context, and move forward with greater clarity.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] text-sm font-bold shadow-lg hover:opacity-95 transition-all"
            >
              <span>Get Started With Synapse</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)] text-sm font-semibold text-[var(--tp-text-primary)] hover:border-[var(--tp-border-focus)] transition-all"
            >
              Sign In to Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 px-4 md:px-8 border-t border-[var(--tp-border-subtle)] bg-[var(--tp-bg-surface)] text-xs text-[var(--tp-text-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[var(--tp-brand-primary)] text-[var(--tp-brand-contrast)] flex items-center justify-center font-bold text-xs">
              S
            </span>
            <span className="font-bold text-[var(--tp-text-primary)]">Synapse</span>
            <span className="text-[var(--tp-text-muted)]">— Visual Identity Preview</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--tp-text-muted)]">
            <span>Primary Burgundy (#790D16)</span>
            <span>•</span>
            <span>Warm Sand (#E5D3AF)</span>
            <span>•</span>
            <span>Soft Ivory (#F5EFE1)</span>
            <span>•</span>
            <span>Dusty Blue (#AEC4D4)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
