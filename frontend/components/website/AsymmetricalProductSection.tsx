"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { WebsiteImage } from "./WebsiteImage";

export function AsymmetricalProductSection() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative bg-background py-24 sm:py-32 lg:py-40 border-b border-border text-foreground overflow-hidden transition-colors duration-200">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute left-0 top-1/3 size-[500px] rounded-full bg-secondary/10 blur-[120px]" />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* LEFT: Large Editorial Copy */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-secondary shadow-2xs">
              <Sparkles className="size-3.5 text-secondary" />
              <span>Contextual Synthesis</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-foreground">
              From scattered <br />
              project data to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-secondary">
                connected intelligence.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
              Break down the silos between PR descriptions, sprint boards, meeting transcripts, and raw requirements. Synapse turns disjointed signals into actionable context before issues compound.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mt-0.5 shrink-0">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span className="text-sm text-foreground/85">Continuous requirement ambiguity checking</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mt-0.5 shrink-0">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span className="text-sm text-foreground/85">Automated risk signals extracted from team standups</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-5 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mt-0.5 shrink-0">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <span className="text-sm text-foreground/85">Traceable link between user story, ticket, and test suite</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Large Asymmetrical Product Screenshot with Floating Signal Cards */}
          <div className="lg:col-span-7 relative">
            {/* Main Screenshot Canvas */}
            <div className="relative rounded-3xl bg-card border border-border shadow-2xl p-2 sm:p-4">
              <WebsiteImage
                imageKey="PROJECT_INTELLIGENCE_DASHBOARD"
                alt="Synapse Connected Intelligence Dashboard"
                aspectRatio="wide"
                variant={isDark ? "dark" : "light"}
                previewType="dashboard"
                mockupTitle="System Delivery Matrix"
                mockupSubtitle="Synthesized project signals across repositories and sprints"
                className="rounded-2xl"
              />
            </div>

            {/* FLOATING CARD 1: Risk Insight Card */}
            <div className="absolute -top-6 -right-2 sm:-top-8 sm:-right-6 w-64 sm:w-72 rounded-2xl bg-card/95 border border-border p-4 shadow-xl backdrop-blur-xl transform rotate-2 hover:rotate-0 transition-transform duration-300 z-20 text-foreground">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-semibold">
                  <AlertTriangle className="size-3.5" />
                  <span>Risk Signal</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">RISK_INSIGHT_CARD</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Scope drift detected in Sprint 12: 3 tasks missing acceptance criteria.
              </p>
              <div className="mt-2 text-[10px] text-secondary font-medium flex items-center gap-1">
                <span>Auto-triaged to Tech Lead</span>
              </div>
            </div>

            {/* FLOATING CARD 2: Project Signal Card */}
            <div className="absolute -bottom-8 -left-2 sm:-bottom-10 sm:-left-6 w-68 sm:w-80 rounded-2xl bg-card/95 border border-border p-4 shadow-xl backdrop-blur-xl transform -rotate-2 hover:rotate-0 transition-transform duration-300 z-20 text-foreground">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1.5 text-secondary font-semibold">
                  <Sparkles className="size-3.5" />
                  <span>Project Signal</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">PROJECT_SIGNAL_CARD</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                92% acceptance criteria coverage achieved across active sprint tickets.
              </p>
              <div className="mt-2.5 h-1.5 w-full bg-border rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full w-[92%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
