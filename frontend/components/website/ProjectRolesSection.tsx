"use client";

import React from "react";
import { Compass, CalendarCheck2, Users2, Terminal, Eye, ArrowUpRight } from "lucide-react";
import { PROJECT_ROLES } from "./constants";

export function ProjectRolesSection() {
  const iconMap = {
    Compass,
    CalendarCheck2,
    Users2,
    Terminal,
    Eye,
  };

  const disciplines = [
    { label: "Planning", desc: "Predictable velocity" },
    { label: "Engineering", desc: "Clarity on tickets" },
    { label: "Product", desc: "Traceable requirements" },
    { label: "AI Intelligence", desc: "Autonomous synthesis" },
    { label: "Collaboration", desc: "Actionable meetings" },
    { label: "Delivery", desc: "Verified test cases" },
  ];

  return (
    <section id="roles" className="relative bg-background py-24 sm:py-32 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
            Cross-Functional Alignment
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.08]">
            One workspace. <br />
            Every role aligned.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Eliminate conflicting priorities and information silos with role-specific views tailored to each discipline.
          </p>
        </div>

        {/* 5 ROLE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-24">
          {PROJECT_ROLES.map((role) => {
            const Icon = iconMap[role.icon as keyof typeof iconMap] || Terminal;
            return (
              <div
                key={role.role}
                className="group relative rounded-2xl bg-card border border-border p-6 shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-foreground"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                      {role.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {role.role}
                  </h3>
                  <div className="text-xs font-mono text-secondary font-semibold mb-3">
                    {role.tagline}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Tailored Canvas</span>
                  <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* SOCIAL PROOF & PRODUCT PRINCIPLES STRIP */}
        <div className="rounded-3xl bg-card border border-border p-8 sm:p-12 shadow-xl text-center text-foreground">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-secondary font-bold mb-2">
            Engineering Foundations
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Built for modern software teams.
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            Designed to keep project context, people, and execution connected at every phase.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 border-t border-border">
            {disciplines.map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-background/60 border border-border">
                <div className="font-bold text-sm text-foreground mb-0.5">
                  {item.label}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
