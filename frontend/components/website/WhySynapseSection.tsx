"use client";

import React from "react";
import { CheckCircle2, Clock, Compass, ShieldAlert } from "lucide-react";

export function WhySynapseSection() {
  const statements = [
    {
      num: "01",
      title: "Less manual coordination",
      description: "Reduce the repetitive work around planning, status reporting, meeting notes distillation, and project documentation.",
      icon: Clock,
      detail: "Automated ticket-from-meeting extraction and instant sprint recaps.",
    },
    {
      num: "02",
      title: "Better project context",
      description: "Keep requirements, architecture decisions, team tasks, and semantic knowledge permanently connected across iterations.",
      icon: Compass,
      detail: "No more stale wiki pages or disconnected Jira tickets.",
    },
    {
      num: "03",
      title: "Earlier signals",
      description: "Surface useful project signals, scope drift, and requirement ambiguities before delivery bottlenecks become harder to manage.",
      icon: ShieldAlert,
      detail: "Context-aware vulnerability and blocker alerts.",
    },
  ];

  return (
    <section className="relative bg-background py-24 sm:py-32 lg:py-40 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Editorial Heading */}
        <div className="mx-auto max-w-4xl text-center mb-16 sm:mb-24">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-4">
            The Synapse Advantage
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.08]">
            Project management should <br />
            do more than track work.
          </h2>
          <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Synapse moves beyond static task tracking by connecting project context, collaboration, and AI-assisted decision support.
          </p>
        </div>

        {/* 3 LARGE EDITORIAL STATEMENTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {statements.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.num}
                className="group relative rounded-3xl bg-card border border-border p-8 sm:p-10 shadow-lg hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between text-foreground"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono text-muted-foreground/30 group-hover:text-primary transition-colors">
                      {item.num}
                    </span>
                    <div className="size-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center">
                      <Icon className="size-6" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-extrabold tracking-tight text-foreground mb-4">
                    {item.title}
                  </h3>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-border flex items-center gap-2 text-xs font-semibold text-secondary">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{item.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
