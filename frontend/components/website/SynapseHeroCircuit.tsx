"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";

export function SynapseHeroCircuit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ rx: 0, ry: 0 });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotation({
      rx: -(y * 14),
      ry: x * 18,
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setRotation({ rx: 0, ry: 0 });
  }, []);

  return (
    <header
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative pt-12 sm:pt-16 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-between overflow-hidden"
    >
      {/* 1. CIRCUIT BOARD BACKGROUND SVG */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <svg
          className="w-full h-full opacity-40 dark:opacity-25"
          viewBox="0 0 1440 850"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="circuit-grad-syn" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#258663" stopOpacity="0" />
              <stop offset="0.65" stopColor="#258663" stopOpacity="0.75" />
              <stop offset="1" stopColor="#A8D6CF" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Left Branch Traces */}
          <path
            d="M720 540 H520 V420 H280 V320 H120"
            className="circuit-trace"
          />
          <path
            d="M720 540 H520 V420 H280 V320 H120"
            className="circuit-pulse"
            stroke="url(#circuit-grad-syn)"
          />
          <circle cx="120" cy="320" r="4" fill="#258663" />

          <path
            d="M720 560 H480 V640 H220"
            className="circuit-trace"
          />
          <path
            d="M720 560 H480 V640 H220"
            className="circuit-pulse"
            stroke="url(#circuit-grad-syn)"
          />
          <circle cx="220" cy="640" r="4" fill="#258663" />

          {/* Right Branch Traces */}
          <path
            d="M720 540 H920 V420 H1160 V320 H1320"
            className="circuit-trace"
          />
          <path
            d="M720 540 H920 V420 H1160 V320 H1320"
            className="circuit-pulse"
            stroke="url(#circuit-grad-syn)"
          />
          <circle cx="1320" cy="320" r="4" fill="#258663" />

          <path
            d="M720 560 H960 V640 H1220"
            className="circuit-trace"
          />
          <path
            d="M720 560 H960 V640 H1220"
            className="circuit-pulse"
            stroke="url(#circuit-grad-syn)"
          />
          <circle cx="1220" cy="640" r="4" fill="#258663" />

          {/* Top connection lines */}
          <path d="M720 480 V300" className="circuit-trace" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* 2. HERO HEADLINE & COPY */}
      <div className="relative z-10 max-w-4xl text-center flex flex-col items-center">
        {/* Eyebrow badge matching reference */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/70 dark:bg-card/40 backdrop-blur-md text-xs font-medium text-foreground mb-6 shadow-2xs animate-rise">
          <span className="flex size-4 rounded bg-[#258663] text-white items-center justify-center">
            <Check className="size-2.5 stroke-[3]" />
          </span>
          <span>Trusted by 4,000+ modern engineering teams</span>
        </div>

        {/* Headline: Editorial typography matching reference */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-normal tracking-[-0.04em] text-foreground leading-[1.02] mb-6">
          <span className="block font-medium">Project Management</span>
          <span className="block text-muted-foreground/75 font-light">
            <span className="font-normal italic mr-2 text-muted-foreground/60">that</span>
            <span className="font-semibold text-foreground">thinks ahead.</span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-sm sm:text-base md:text-lg text-muted-foreground font-normal leading-relaxed mb-8">
          Synapse brings project requirements, tasks, sprints, team coordination, and AI-powered insights into one connected workspace—helping teams identify risks, understand dependencies, and make better-informed decisions.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-14">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-[var(--button-primary-hover)] transition-all active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="size-4" />
          </Link>

          <a
            href="#preview"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium shadow-2xs transition-all"
          >
            <span>Explore Synapse</span>
          </a>
        </div>
      </div>

      {/* 3. CENTRAL HARDWARE / INTELLIGENCE SQUIRCLE NODE & LIVE SIDE CARDS */}
      <div className="relative z-10 w-full max-w-5xl mt-2 flex flex-col items-center">
        {/* Floating status pill above squircle */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 dark:bg-card/70 border border-border text-xs font-mono text-foreground backdrop-blur-md shadow-sm mb-3 z-20">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auto-sync · live</span>
        </div>

        {/* Stage Container */}
        <div className="relative w-full flex items-center justify-center min-h-[300px] sm:min-h-[360px]">
          {/* LEFT LIVE TELEMETRY CARD */}
          <div className="hidden lg:block absolute left-4 xl:left-8 top-12 z-20 w-64 p-4 rounded-2xl bg-card border border-border shadow-xl shadow-black/5 dark:shadow-black/40 text-left transition-transform hover:-translate-y-1 duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">Sprint 24 Velocity</span>
              <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                ON TRACK
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground">78%</span>
                <span className="text-xs text-muted-foreground ml-1.5">completed</span>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                +14.2% vel.
              </span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full w-[78%]" />
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>32 of 41 tasks resolved</span>
              <span className="font-mono">4d remaining</span>
            </div>
          </div>

          {/* CENTER 3D SQUIRCLE INTELLIGENCE NODE */}
          <div className="device-perspective relative flex items-center justify-center size-52 sm:size-64 lg:size-72">
            {/* Ambient drop shadow below device */}
            <div className="absolute inset-4 rounded-[40%] bg-primary/25 dark:bg-primary/35 blur-2xl pointer-events-none" />

            {/* Interactive squircle block */}
            <div
              className="device-float relative size-full rounded-[42px] sm:rounded-[56px] border border-border/60 transition-transform duration-300 ease-out flex items-center justify-center shadow-2xl"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(228,236,232,0.85) 100%)",
                transform: `rotateX(${rotation.rx}deg) rotateY(${rotation.ry}deg)`,
                boxShadow: "0 30px 60px -15px rgba(0,0,0,0.22), inset 0 2px 3px rgba(255,255,255,0.8), inset 0 -4px 8px rgba(0,0,0,0.08)",
              }}
            >
              {/* Inner LED highlight ring */}
              <div className="absolute inset-3 rounded-[34px] sm:rounded-[46px] border border-primary/25 pointer-events-none" />

              {/* Glowing Synapse Core Glyph */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="size-14 sm:size-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                  <Sparkles className="size-7 sm:size-8 animate-pulse" />
                </div>
                <span className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground font-semibold">
                  SYNAPSE ENGINE
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT LIVE TELEMETRY CARD */}
          <div className="hidden lg:block absolute right-4 xl:right-8 top-12 z-20 w-68 p-4 rounded-2xl bg-card border border-border shadow-xl shadow-black/5 dark:shadow-black/40 text-left transition-transform hover:-translate-y-1 duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">Requirement Radar</span>
              <span className="text-[10px] font-mono text-muted-foreground">SCAN #108</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Zero Critical Blockers</span>
                <span className="text-[11px] text-muted-foreground">3 criteria auto-verified</span>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-xl bg-muted/60 text-[11px] text-muted-foreground border border-border/50">
              <span className="font-medium text-foreground">Tip:</span> 1 minor ambiguity in SSO token expiry handled.
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
