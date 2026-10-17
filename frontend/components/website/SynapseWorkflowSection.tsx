'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface WorkflowStep {
  number: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  bulletPoints: string[];
  visualPreview: {
    statusBadge: string;
    headline: string;
    metrics: { label: string; val: string }[];
    callout: string;
  };
}

const steps: WorkflowStep[] = [
  {
    number: '01',
    badge: 'Requirements & Docs',
    title: 'Organize requirements into clear living specs',
    tagline: 'Eliminate ambiguity before a single line of code is written',
    description:
      'Ingest PRDs, briefs, client emails, and notes. Synapse parses acceptance criteria, highlights incomplete edge cases, and links functional objectives directly to downstream execution.',
    bulletPoints: [
      'Automatic ambiguity and testability scores for user stories',
      'Unified document hub linked to architecture and test plans',
      'Traceability back to business goals and stakeholder sign-offs',
    ],
    visualPreview: {
      statusBadge: 'SPEC PARSER · READY',
      headline: 'PRD-2026-v2 · Auth & Multi-Tenant Isolation',
      metrics: [
        { label: 'Completeness', val: '94%' },
        { label: 'Unresolved Questions', val: '2 items' },
        { label: 'Acceptance Criteria', val: '14 tests' },
      ],
      callout: 'AI Note: 2 edge cases lack session token refresh timeouts under high concurrency.',
    },
  },
  {
    number: '02',
    badge: 'Task & Sprint Breakdown',
    title: 'Decompose milestones into balanced sprints',
    tagline: 'Context-aware estimation and workload balancing',
    description:
      'Break high-level features into atomic, testable deliverables. Synapse maps team capacities, historical velocity, and task complexity to craft realistic sprint commitments without overtime burnout.',
    bulletPoints: [
      'Historical velocity calibrations across team members',
      'Automated sprint capacity sizing with holiday/on-call buffers',
      'Instant breakdown of parent epics into child tasks with DoD',
    ],
    visualPreview: {
      statusBadge: 'SPRINT PLANNER · BALANCED',
      headline: 'Sprint 24 · Core Engine & Pipeline',
      metrics: [
        { label: 'Target Velocity', val: '48 pts' },
        { label: 'Allocated Work', val: '46 pts' },
        { label: 'Buffer Reserve', val: '12%' },
      ],
      callout: 'Capacity load across 5 engineers is evenly distributed within 5% standard deviation.',
    },
  },
  {
    number: '03',
    badge: 'Dependency Mapping',
    title: 'Map cross-team blockers before they stall delivery',
    tagline: 'See the ripple effect of delays across upstream deliverables',
    description:
      'Stop discovering blocking API contracts mid-sprint. Synapse models data flows, shared infrastructure, and PR dependencies to highlight critical paths on an interactive dependency graph.',
    bulletPoints: [
      'Real-time dependency chain visualization and blast radius',
      'Automated cross-functional pinging when blocked tasks shift',
      'Identifies single points of failure in technical ownership',
    ],
    visualPreview: {
      statusBadge: 'DEPENDENCY GRAPH · 4 PATHS',
      headline: 'Auth Gateway → Billing Service Contract',
      metrics: [
        { label: 'Direct Blockers', val: '1 PR pending' },
        { label: 'Critical Path', val: 'Tier 1' },
        { label: 'Impact Delay', val: '0 days' },
      ],
      callout: 'Upstream schema migration merged 22m ago. Downstream tasks are now unblocked.',
    },
  },
  {
    number: '04',
    badge: 'Context-Aware AI',
    title: 'Surface continuous insights and risk warnings',
    tagline: 'Continuous intelligence running silently in the background',
    description:
      'Synapse constantly monitors commits, task comments, review turnaround times, and sprint burn-down rates. It proactively flags scope creep and slips before they impact client milestones.',
    bulletPoints: [
      'Proactive risk scoring on delivery commitments',
      'Natural-language Q&A across the entire codebase and tickets',
      'Synthesis of meeting notes and Slack threads into action items',
    ],
    visualPreview: {
      statusBadge: 'NEURAL MONITOR · ACTIVE',
      headline: 'Risk Vector: 3 API endpoints behind review SLA',
      metrics: [
        { label: 'Risk Index', val: 'Low (18%)' },
        { label: 'Review Turnaround', val: '4.2h avg' },
        { label: 'Scope Creep', val: '+2 story pts' },
      ],
      callout: 'Recommendation: Assign backup reviewer for PR #142 to preserve Friday cutoff.',
    },
  },
  {
    number: '05',
    badge: 'Human-in-the-Loop Delivery',
    title: 'Decide with clarity and deliver with confidence',
    tagline: 'AI advises, but your engineering and product leads stay in full control',
    description:
      'Transparent reasoning behind every insight. Review AI-suggested scope adjustments, approve rebalanced sprint loads with one click, and export polished executive reports in seconds.',
    bulletPoints: [
      'One-click approval for rebalancing recommendations',
      'Full audit trail of AI suggestions and team actions',
      'Stakeholder-ready briefing generation with zero manual slide prep',
    ],
    visualPreview: {
      statusBadge: 'EXECUTIVE BRIEF · READY',
      headline: 'Executive Milestone Delivery Readiness',
      metrics: [
        { label: 'Confidence Score', val: '97%' },
        { label: 'Deliverables on Track', val: '14 / 15' },
        { label: 'Days to Release', val: '8 days' },
      ],
      callout: 'Status confirmed: Milestone Beta 1.0 remains on schedule for release.',
    },
  },
];

export function SynapseWorkflowSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = steps[activeStepIndex];

  return (
    <section id="workflow" className="relative py-20 px-4 md:px-8 border-t border-[var(--syn-border)] overflow-hidden">
      {/* Subtle ambient circuit line */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--syn-accent)]/20 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[var(--syn-border)] bg-[var(--syn-chip-bg)] text-[var(--syn-chip-text)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--syn-accent)] animate-ping" />
            END-TO-END INTELLIGENCE
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[var(--syn-text-primary)]">
            How Synapse Works
          </h2>
          <p className="mt-4 text-base md:text-lg text-[var(--syn-text-secondary)] leading-relaxed">
            From initial requirements to final release, Synapse connects documentation, team velocity, and technical
            dependencies into a coherent, proactive workflow.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {steps.map((step, idx) => {
            const isSelected = idx === activeStepIndex;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--syn-accent)] text-white shadow-lg shadow-[var(--syn-accent)]/20 border border-[var(--syn-accent)]'
                    : 'bg-[var(--syn-surface-card)] text-[var(--syn-text-secondary)] border border-[var(--syn-border)] hover:border-[var(--syn-border-focus)] hover:text-[var(--syn-text-primary)]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-[var(--syn-chip-bg)] text-[var(--syn-text-muted)]'
                  }`}
                >
                  {step.number}
                </span>
                <span>{step.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 md:p-10 rounded-3xl bg-[var(--syn-surface-card)] border border-[var(--syn-border)] shadow-xl relative overflow-hidden backdrop-blur-sm">
          {/* Subtle gradient behind */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--syn-accent)]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left: Step Details */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-extrabold text-[var(--syn-accent)] tracking-tight">
                {activeStep.number}
              </span>
              <div className="h-4 w-px bg-[var(--syn-border)]" />
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--syn-text-muted)]">
                {activeStep.badge}
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-semibold text-[var(--syn-text-primary)] leading-tight tracking-tight">
              {activeStep.title}
            </h3>

            <p className="mt-2 text-sm font-medium text-[var(--syn-accent)]">
              {activeStep.tagline}
            </p>

            <p className="mt-4 text-sm text-[var(--syn-text-secondary)] leading-relaxed">
              {activeStep.description}
            </p>

            <ul className="mt-6 space-y-3">
              {activeStep.bulletPoints.map((bp) => (
                <li key={bp} className="flex items-start gap-2.5 text-xs md:text-sm text-[var(--syn-text-secondary)]">
                  <div className="w-4 h-4 rounded-full bg-[var(--syn-accent)]/10 text-[var(--syn-accent)] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ✓
                  </div>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--syn-accent)] text-white text-xs font-semibold hover:bg-[var(--syn-accent-hover)] transition-all shadow-md shadow-[var(--syn-accent)]/15"
              >
                Try this workflow
                <span>→</span>
              </Link>
              <button
                type="button"
                onClick={() => setActiveStepIndex((prev) => (prev + 1) % steps.length)}
                className="text-xs font-semibold text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)] transition-colors cursor-pointer"
              >
                Next step ({steps[(activeStepIndex + 1) % steps.length].number}) →
              </button>
            </div>
          </div>

          {/* Right: Visual Mock Interface */}
          <div className="lg:col-span-6">
            <div className="p-5 md:p-6 rounded-2xl bg-[var(--syn-canvas-bg)] border border-[var(--syn-border)] shadow-lg relative">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--syn-border)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  <span className="text-[11px] font-mono text-[var(--syn-text-muted)] ml-2">synapse://pipeline/stage-{activeStep.number}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-[var(--syn-accent)]/10 text-[var(--syn-accent)] border border-[var(--syn-accent)]/20">
                  {activeStep.visualPreview.statusBadge}
                </span>
              </div>

              {/* Window Content */}
              <div className="pt-5 space-y-4">
                <div>
                  <div className="text-[11px] text-[var(--syn-text-muted)] uppercase tracking-wider font-semibold">Active Pipeline Stage</div>
                  <div className="text-base font-semibold text-[var(--syn-text-primary)] mt-0.5">
                    {activeStep.visualPreview.headline}
                  </div>
                </div>

                {/* Metrics 3-box */}
                <div className="grid grid-cols-3 gap-2.5">
                  {activeStep.visualPreview.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-xl bg-[var(--syn-surface-card)] border border-[var(--syn-border)]"
                    >
                      <div className="text-[10px] text-[var(--syn-text-muted)] uppercase tracking-wider">{m.label}</div>
                      <div className="text-sm md:text-base font-bold text-[var(--syn-text-primary)] mt-1">{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Simulated live visual stream */}
                <div className="p-3.5 rounded-xl bg-[var(--syn-surface-elevated)] border border-[var(--syn-border)] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-[var(--syn-accent)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--syn-accent)] animate-pulse" />
                      Live Assistant Synthesis
                    </span>
                    <span className="text-[10px] text-[var(--syn-text-muted)]">Verified</span>
                  </div>
                  <p className="text-xs text-[var(--syn-text-secondary)] leading-relaxed italic">
                    &ldquo;{activeStep.visualPreview.callout}&rdquo;
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-[var(--syn-text-muted)] font-mono">
                    <span>Pipeline Progress</span>
                    <span>{((activeStepIndex + 1) / steps.length) * 100}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--syn-border)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--syn-accent)] to-teal-400 transition-all duration-500 rounded-full"
                      style={{ width: `${((activeStepIndex + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
