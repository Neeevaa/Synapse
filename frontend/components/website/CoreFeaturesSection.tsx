"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, Sparkles, Kanban, FileCheck2, Video } from "lucide-react";
import { CORE_FEATURES } from "./constants";
import { WebsiteImage } from "./WebsiteImage";

export function CoreFeaturesSection() {
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

  const iconMap = {
    Kanban,
    FileCheck2,
    Video,
    Sparkles,
  };

  return (
    <section id="features" className="relative bg-background py-24 sm:py-32 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Header Grid: Title on left, subtitle on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-end mb-16 sm:mb-20">
          <div className="lg:col-span-7">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08]">
              Everything you need <br />
              to move a project forward.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-2">
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              One connected workspace for planning, collaboration, requirements, and project intelligence.
            </p>
          </div>
        </div>

        {/* 4-CARD POSTER GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {CORE_FEATURES.map((card, index) => {
            const Icon = iconMap[card.icon as keyof typeof iconMap] || Sparkles;
            const previewTypes = ["board", "requirements", "meeting", "ai"] as const;
            const previewType = previewTypes[index] || "generic";

            return (
              <div
                key={card.id}
                className="group relative flex flex-col justify-between rounded-3xl bg-card border border-border p-6 sm:p-8 lg:p-10 shadow-xl hover:border-primary/50 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-foreground"
              >
                {/* Subtle Ambient Radial Glow */}
                <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-secondary/15 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Top Card Info */}
                <div className="relative z-10 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-secondary/15 border border-secondary/30 px-3 py-1.5 text-xs font-mono font-medium text-secondary">
                      <Icon className="size-3.5 text-secondary" />
                      <span>{card.tagline}</span>
                    </div>
                    <div className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary-foreground group-hover:bg-primary group-hover:border-primary transition-all shadow-2xs">
                      <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
                    {card.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Visual / Screenshot Poster */}
                <div className="relative z-10 mt-auto rounded-2xl overflow-hidden border border-border bg-card">
                  <WebsiteImage
                    imageKey={card.imageKey}
                    alt={card.title}
                    aspectRatio="wide"
                    variant={isDark ? "dark" : "light"}
                    previewType={previewType}
                    mockupTitle={card.title}
                    mockupSubtitle={card.description}
                    className="group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>

                {/* Bottom Micro-Accent Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
