'use client';

import React from 'react';
import Link from 'next/link';

export function SynapseFooter() {
  return (
    <footer className="relative border-t border-[var(--syn-border)] bg-[var(--syn-canvas-bg)] text-[var(--syn-text-secondary)] py-14 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[var(--syn-border)]">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--syn-accent)] to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[var(--syn-accent)]/20">
                S
              </span>
              <span className="font-semibold text-lg tracking-tight text-[var(--syn-text-primary)]">
                Synapse
              </span>
            </Link>

            <p className="text-xs md:text-sm text-[var(--syn-text-secondary)] max-w-sm leading-relaxed">
              AI-Powered Project Management Platform. Connecting requirements, sprints, dependencies, and delivery insights into one coherent workspace.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
              <span className="text-[11px] font-mono text-[var(--syn-text-muted)]">
                v2.4.0-stable
              </span>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--syn-text-primary)]">
              Product
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#hero" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Overview
                </a>
              </li>
              <li>
                <a href="#product-preview" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Interactive Workspace
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Core Capabilities
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#why" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Why Synapse
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Subscription Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--syn-text-primary)]">
              Platform & Auth
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Member Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Create Organization
                </Link>
              </li>
              <li>
                <Link href="/register?plan=PRO" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Try Pro Plan
                </Link>
              </li>
              <li>
                <Link href="/register?plan=ENTERPRISE" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Enterprise Request
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[var(--syn-text-primary)] transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Architecture */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--syn-text-primary)]">
              Security & Engine
            </div>
            <ul className="space-y-2 text-xs">
              <li className="text-[var(--syn-text-muted)]">
                FastAPI Async Engine
              </li>
              <li className="text-[var(--syn-text-muted)]">
                Next.js App Router
              </li>
              <li className="text-[var(--syn-text-muted)]">
                Local Ollama / Neural LLM
              </li>
              <li className="text-[var(--syn-text-muted)]">
                Vector Knowledge Index
              </li>
              <li className="text-[var(--syn-text-muted)]">
                Role-Based Access Control
              </li>
              <li className="text-[var(--syn-text-muted)]">
                Multi-Tenant Isolation
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--syn-text-muted)]">
          <p>© {new Date().getFullYear()} Synapse. MCA Project Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px]">Strict Privacy & Data Security</span>
            <span>•</span>
            <span className="font-mono text-[11px]">Zero Third-Party Training</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
