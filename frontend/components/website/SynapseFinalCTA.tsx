'use client';

import React from 'react';
import Link from 'next/link';

export function SynapseFinalCTA() {
  return (
    <section className="relative py-20 px-4 md:px-8 border-t border-[var(--syn-border)] overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-3xl p-8 md:p-16 text-center overflow-hidden border border-[var(--syn-border)] bg-[var(--syn-surface-card)] shadow-2xl">
          {/* Ambient luminous glow circles */}
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-[var(--syn-accent)]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Circuit trace background watermark */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
            viewBox="0 0 1200 400"
            fill="none"
            stroke="currentColor"
          >
            <path d="M 0 200 H 300 L 400 120 H 800 L 900 200 H 1200" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M 100 0 V 150 L 150 200 V 400" strokeWidth="1.5" />
            <circle cx="400" cy="120" r="4" fill="currentColor" />
            <circle cx="800" cy="120" r="4" fill="currentColor" />
            <circle cx="150" cy="200" r="4" fill="currentColor" />
          </svg>

          {/* Badge */}
          <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[var(--syn-border)] bg-[var(--syn-chip-bg)] text-[var(--syn-chip-text)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--syn-accent)] animate-ping" />
            READY TO LEVEL UP YOUR DELIVERY
          </div>

          {/* Headline */}
          <h2 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[var(--syn-text-primary)] max-w-3xl mx-auto">
            Bring Your Projects Into Focus.
          </h2>

          {/* Supporting Text */}
          <p className="relative z-10 mt-6 text-base md:text-xl text-[var(--syn-text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Connect your team&apos;s work, understand the context, and move forward with greater clarity.
          </p>

          {/* CTAs */}
          <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[var(--syn-accent)] text-white text-sm font-semibold hover:bg-[var(--syn-accent-hover)] transition-all shadow-xl shadow-[var(--syn-accent)]/25 hover:scale-[1.02]"
            >
              <span>Get Started With Synapse</span>
              <span className="text-base">→</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[var(--syn-surface-elevated)] border border-[var(--syn-border)] text-sm font-semibold text-[var(--syn-text-primary)] hover:border-[var(--syn-border-focus)] transition-all hover:scale-[1.02]"
            >
              Sign In to Workspace
            </Link>
          </div>

          {/* Trust points */}
          <div className="relative z-10 mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--syn-text-muted)] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Free tier available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Multi-tenant isolation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Fast local setup
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
