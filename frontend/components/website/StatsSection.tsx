"use client";

import React from "react";
import { Sparkles, Terminal, Cpu, Network } from "lucide-react";

export function StatsSection() {
  const capabilities = [
    {
      metric: "8+",
      label: "AI CAPABILITIES",
      sub: "Context-aware intelligence services",
      icon: Sparkles,
    },
    {
      metric: "1",
      label: "CONNECTED WORKSPACE",
      sub: "Planning, specs, tasks & meetings",
      icon: Network,
    },
    {
      metric: "6",
      label: "PROJECT ROLES",
      sub: "Synchronized cross-functional clarity",
      icon: Terminal,
    },
    {
      metric: "100%",
      label: "TRACEABILITY",
      sub: "From requirement to shipped feature",
      icon: Cpu,
    },
  ];

  return (
    <section id="stats" className="relative bg-background py-20 sm:py-28 lg:py-32 border-b border-border transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Centered Editorial Trust Statement */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold mb-4">
            Unified Engineering Fabric
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Built for teams that build software.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed">
            From requirements to retrospectives, Synapse keeps your project context connected and actionable.
          </p>
        </div>

        {/* Minimal High-Contrast Product Capabilities Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 pt-8 border-t border-border">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col items-center sm:items-start text-center sm:text-left p-4 rounded-2xl hover:bg-card/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2 text-secondary">
                  <Icon className="size-4 opacity-80" />
                  <span className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase font-semibold">
                    {item.label}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-foreground group-hover:text-primary transition-colors mb-2">
                  {item.metric}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground leading-snug">
                  {item.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
