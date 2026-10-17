'use client';

import React from 'react';

interface ComparisonRow {
  dimension: string;
  traditional: string;
  synapse: string;
  advantageBadge: string;
}

const comparisons: ComparisonRow[] = [
  {
    dimension: 'Requirement Ingestion',
    traditional: 'Static documentation copied across tickets; becomes obsolete as code diverges.',
    synapse: 'Living specs continuously cross-checked against pull requests, tests, and deliverables.',
    advantageBadge: 'Active Traceability',
  },
  {
    dimension: 'Dependency Tracking',
    traditional: 'Manual drop-down links often forgotten; discovered after a blocker stalls sprint delivery.',
    synapse: 'Interactive dependency graph linking shared services, schema migrations, and PR reviews.',
    advantageBadge: 'Blast Radius Preview',
  },
  {
    dimension: 'Risk & Delay Detection',
    traditional: 'Surfaced during retrospective meetings days or weeks after the slip occurred.',
    synapse: 'Proactive velocity alerts and capacity warning vectors calculated continuously in real time.',
    advantageBadge: 'Pre-Sprint Warnings',
  },
  {
    dimension: 'Sprint Allocation',
    traditional: 'Flat story-point averages that ignore individual skillset match, on-call duty, or review loads.',
    synapse: 'Context-weighted workload distribution considering code ownership and review turnarounds.',
    advantageBadge: 'Burnout Protection',
  },
  {
    dimension: 'Context Retrieval',
    traditional: 'Fragmented searches across chat threads, issue trackers, meeting transcripts, and drive folders.',
    synapse: 'Unified vector index indexing project tickets, code diffs, meeting notes, and decision logs.',
    advantageBadge: 'Single Source of Truth',
  },
  {
    dimension: 'Human Oversight',
    traditional: 'Black-box manual status reports often tailored to avoid difficult questions.',
    synapse: 'AI acts as a transparent copilot—every suggestion provides source citations and requires lead approval.',
    advantageBadge: 'Full Human Control',
  },
];

export function SynapseWhySection() {
  return (
    <section id="why" className="relative py-20 px-4 md:px-8 border-t border-[var(--syn-border)] overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[var(--syn-border)] bg-[var(--syn-chip-bg)] text-[var(--syn-chip-text)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--syn-accent)]" />
            THE CONTEXT DIFFERENCE
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[var(--syn-text-primary)]">
            Why Synapse
          </h2>
          <p className="mt-4 text-base md:text-lg text-[var(--syn-text-secondary)] leading-relaxed">
            Traditional project trackers are passive digital clipboards that require manual upkeep. Synapse is a context-aware coordination platform that helps teams move with clarity.
          </p>
        </div>

        {/* 3 Pillar Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-[var(--syn-surface-card)] border border-[var(--syn-border)] shadow-sm hover:border-[var(--syn-border-focus)] transition-all">
            <div className="w-10 h-10 rounded-xl bg-[var(--syn-accent)]/10 text-[var(--syn-accent)] flex items-center justify-center font-bold text-lg mb-4">
              01
            </div>
            <h3 className="text-lg font-semibold text-[var(--syn-text-primary)]">Connected Visibility</h3>
            <p className="mt-2 text-sm text-[var(--syn-text-secondary)] leading-relaxed">
              No more blind spots. Requirements, code commits, sprint burn-down, and PR discussions exist in one shared mental model.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--syn-surface-card)] border border-[var(--syn-border)] shadow-sm hover:border-[var(--syn-border-focus)] transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold text-lg mb-4">
              02
            </div>
            <h3 className="text-lg font-semibold text-[var(--syn-text-primary)]">Contextual Intelligence</h3>
            <p className="mt-2 text-sm text-[var(--syn-text-secondary)] leading-relaxed">
              AI doesn’t write your software; it eliminates the busywork of synthesizing status reports, cross-checking PRDs, and triaging blockers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--syn-surface-card)] border border-[var(--syn-border)] shadow-sm hover:border-[var(--syn-border-focus)] transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-lg mb-4">
              03
            </div>
            <h3 className="text-lg font-semibold text-[var(--syn-text-primary)]">Human-in-the-Loop</h3>
            <p className="mt-2 text-sm text-[var(--syn-text-secondary)] leading-relaxed">
              Engineering leads retain full sovereignty. Every AI recommendation is transparent, audited, and strictly subject to your team’s review.
            </p>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="rounded-3xl border border-[var(--syn-border)] bg-[var(--syn-surface-card)] shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 p-5 border-b border-[var(--syn-border)] bg-[var(--syn-chip-bg)] text-xs font-bold uppercase tracking-wider text-[var(--syn-text-muted)]">
            <div className="md:col-span-3">Capability Dimension</div>
            <div className="md:col-span-4 hidden md:block">Passive Project Trackers</div>
            <div className="md:col-span-5 hidden md:block text-[var(--syn-accent)]">Synapse Connected Platform</div>
          </div>

          <div className="divide-y divide-[var(--syn-border)]">
            {comparisons.map((row, idx) => (
              <div
                key={row.dimension}
                className={`grid grid-cols-1 md:grid-cols-12 p-5 gap-3 items-center hover:bg-[var(--syn-surface-elevated)] transition-colors ${
                  idx % 2 === 1 ? 'bg-[var(--syn-canvas-bg)]/40' : ''
                }`}
              >
                {/* Dimension & badge */}
                <div className="md:col-span-3">
                  <div className="text-sm font-semibold text-[var(--syn-text-primary)]">{row.dimension}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--syn-accent)]/10 text-[var(--syn-accent)] border border-[var(--syn-accent)]/20">
                    {row.advantageBadge}
                  </span>
                </div>

                {/* Traditional */}
                <div className="md:col-span-4 text-xs md:text-sm text-[var(--syn-text-muted)] leading-relaxed flex items-start gap-2">
                  <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                  <span>{row.traditional}</span>
                </div>

                {/* Synapse */}
                <div className="md:col-span-5 text-xs md:text-sm text-[var(--syn-text-primary)] leading-relaxed flex items-start gap-2 font-medium">
                  <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{row.synapse}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
