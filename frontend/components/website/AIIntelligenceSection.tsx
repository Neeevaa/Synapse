"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Video, FileCheck, Layers, Search, ArrowRight } from "lucide-react";
import { WebsiteImage } from "./WebsiteImage";

export function AIIntelligenceSection() {
  const [activeStep, setActiveStep] = useState(1);
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

  const aiCapabilities = [
    {
      id: "meeting",
      title: "Meeting Intelligence",
      description: "Turn conversations into decisions, surfaced risks, and trackable backlog items.",
      icon: Video,
      pill: "Voice to Action",
    },
    {
      id: "requirements",
      title: "Requirement Checker",
      description: "Review requirements for clarity, completeness, edge-case gaps, and context.",
      icon: FileCheck,
      pill: "Clarity Engine",
    },
    {
      id: "testcases",
      title: "AI Test Case Generator",
      description: "Generate structured test cases and acceptance verification matrices directly from specs.",
      icon: Layers,
      pill: "Automated QA",
    },
    {
      id: "knowledge",
      title: "Knowledge Search",
      description: "Find relevant project context through semantic search across all sprint history.",
      icon: Search,
      pill: "Semantic Graph",
    },
  ];

  const pipelineSteps = [
    { num: 1, label: "Context", desc: "Specs, tickets & transcripts ingested" },
    { num: 2, label: "Intelligence", desc: "Cross-referencing dependencies & constraints" },
    { num: 3, label: "Recommendation", desc: "Surfacing blockers & test matrices" },
    { num: 4, label: "Action", desc: "Direct assignment & tracked deliverables" },
  ];

  return (
    <section id="ai" className="relative bg-background py-24 sm:py-32 lg:py-40 border-b border-border text-foreground overflow-hidden transition-colors duration-200">
      {/* Ambient Radial Spotlight */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-secondary/15 blur-[140px]" />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-secondary mb-4 shadow-2xs">
            <Sparkles className="size-3.5 text-secondary" />
            <span>Autonomous Intelligence Fabric</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.08]">
            AI that understands <br />
            your project context.
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Synapse connects project information with AI assistance so teams can move from information to action faster without conversational friction.
          </p>
        </div>

        {/* CONTEXT -> INTELLIGENCE -> RECOMMENDATION -> ACTION PIPELINE */}
        <div className="mx-auto max-w-4xl mb-16 sm:mb-20">
          <div className="rounded-2xl border border-border bg-card/90 p-4 sm:p-6 backdrop-blur-xl shadow-lg">
            <div className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
              Intelligence Flow Pipeline
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pipelineSteps.map((step) => {
                const isSelected = activeStep === step.num;
                return (
                  <button
                    key={step.num}
                    onClick={() => setActiveStep(step.num)}
                    className={`group relative rounded-xl p-3.5 text-left transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? "bg-secondary/15 border-secondary text-foreground shadow-md"
                        : "bg-background/40 border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        0{step.num}
                      </span>
                      {isSelected && <span className="size-2 rounded-full bg-secondary animate-ping" />}
                    </div>
                    <div className="font-semibold text-sm text-foreground mb-1">
                      {step.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      {step.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* LARGE AI VISUALIZATION / PRODUCT SCREENSHOT */}
        <div className="mx-auto max-w-5xl mb-16 sm:mb-20">
          <div className="rounded-3xl border border-border bg-card p-3 sm:p-6 shadow-2xl">
            <WebsiteImage
              imageKey="AI_INTELLIGENCE_SCREEN"
              alt="Synapse AI Project Intelligence Visualization"
              aspectRatio="wide"
              variant={isDark ? "dark" : "light"}
              previewType="ai"
              mockupTitle="Contextual Intelligence Matrix"
              mockupSubtitle="Synthesizing multi-modal project signals into prioritized deliverables"
              className="rounded-2xl"
            />
          </div>
        </div>

        {/* 4 AI CAPABILITY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiCapabilities.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="group relative rounded-2xl bg-card border border-border p-6 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {card.pill}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>Context Linked</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
