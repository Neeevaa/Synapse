"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { WORKFLOW_STAGES } from "./constants";
import { WebsiteImage } from "./WebsiteImage";

export function WorkflowSection() {
  const [selectedStage, setSelectedStage] = useState(0);
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
    <section id="workflow" className="relative bg-background py-24 sm:py-32 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
            Connected Lifecycle
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.08]">
            From idea to delivery, <br />
            everything stays connected.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Eliminate context loss between product planning, technical breakdown, and operational retrospective.
          </p>
        </div>

        {/* 5-STAGE WORKFLOW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-14">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const isCurrent = selectedStage === idx;
            return (
              <button
                key={stage.step}
                onClick={() => setSelectedStage(idx)}
                className={`group relative rounded-2xl p-5 text-left transition-all duration-300 border cursor-pointer ${
                  isCurrent
                    ? "bg-card border-primary shadow-xl -translate-y-1 text-foreground"
                    : "bg-card/60 border-border hover:bg-card hover:border-primary/40 shadow-xs text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stage.step}
                  </span>
                  {isCurrent && <span className="size-2 rounded-full bg-secondary" />}
                </div>

                <div className="text-[11px] font-mono uppercase tracking-wider text-secondary font-semibold mb-1">
                  {stage.label}
                </div>

                <h3 className="text-sm font-bold text-foreground mb-2">
                  {stage.title}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {stage.description}
                </p>

                {/* Connecting Arrow for Desktop */}
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-card border border-border items-center justify-center text-muted-foreground z-10 shadow-xs">
                    <ChevronRight className="size-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* WORKFLOW VISUAL IMAGE SHOWCASE */}
        <div className="mx-auto max-w-5xl rounded-3xl bg-card border border-border p-4 sm:p-8 shadow-xl text-foreground">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-secondary font-bold">
                STAGE 0{selectedStage + 1} ACTIVE
              </span>
              <span className="text-xs text-muted-foreground">/ {WORKFLOW_STAGES[selectedStage].label}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-secondary" />
              <span>Full Context Synchronized</span>
            </div>
          </div>

          <WebsiteImage
            imageKey="WORKFLOW_IMAGE"
            alt="Synapse End-to-End Workflow"
            aspectRatio="wide"
            variant={isDark ? "dark" : "light"}
            previewType="board"
            mockupTitle={`${WORKFLOW_STAGES[selectedStage].title} Execution Canvas`}
            mockupSubtitle={WORKFLOW_STAGES[selectedStage].description}
            className="rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
}
