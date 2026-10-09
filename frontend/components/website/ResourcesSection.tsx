"use client";

import React from "react";
import { BookOpen, Sparkles, FileCode2, ArrowUpRight } from "lucide-react";

export function ResourcesSection() {
  const resources = [
    {
      title: "Documentation",
      tagline: "Architecture & Integrations",
      description: "Learn how Synapse works, configure Webhooks, and set up your team's workflow pipelines.",
      icon: BookOpen,
      href: "#showcase",
    },
    {
      title: "Project Intelligence",
      tagline: "AI-Assisted Workflow",
      description: "Understand how context-aware AI extracts decisions, tracks acceptance criteria, and generates test cases.",
      icon: Sparkles,
      href: "#ai",
    },
    {
      title: "Research & Design",
      tagline: "Principles of Coordination",
      description: "Explore the core engineering principles behind connected project intelligence and reduced overhead.",
      icon: FileCode2,
      href: "#roles",
    },
  ];

  return (
    <section id="resources" className="relative bg-background py-24 sm:py-32 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
            Knowledge & Insights
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.08]">
            Explore Synapse
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            In-depth guides, architectural blueprints, and engineering methodologies.
          </p>
        </div>

        {/* 3 EDITORIAL RESOURCE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {resources.map((res) => {
            const Icon = res.icon;
            return (
              <a
                key={res.title}
                href={res.href}
                className="group relative rounded-3xl bg-card border border-border p-8 shadow-md hover:border-primary/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between text-foreground"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="size-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-6" />
                    </div>
                    <div className="size-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary-foreground group-hover:bg-primary transition-colors">
                      <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono uppercase tracking-wider text-secondary font-semibold block mb-2">
                    {res.tagline}
                  </span>

                  <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3 group-hover:text-primary transition-colors">
                    {res.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {res.description}
                  </p>
                </div>

                <div className="pt-6 mt-8 border-t border-border flex items-center gap-1.5 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Read Overview</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
