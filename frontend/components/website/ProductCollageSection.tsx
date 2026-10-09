"use client";

import React, { useState, useEffect } from "react";
import { WebsiteImage } from "./WebsiteImage";

export function ProductCollageSection() {
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
      {/* Background Soft Glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 size-[700px] rounded-full bg-secondary/10 blur-[150px]" />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
            Interface Craftsmanship
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.08]">
            An interface designed <br />
            for focus and velocity.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every screen in Synapse is crafted for dense engineering clarity with zero clutter.
          </p>
        </div>

        {/* OVERLAPPING EDITORIAL SCREENSHOT COLLAGE */}
        <div className="relative mx-auto max-w-6xl pt-6 pb-12">
          {/* Main Large Center Image */}
          <div className="relative z-20 mx-auto w-full md:w-[82%] rounded-3xl bg-card border border-border p-2 sm:p-4 shadow-2xl">
            <WebsiteImage
              imageKey="COLLAGE_DASHBOARD"
              alt="Synapse Engineering Dashboard Overview"
              aspectRatio="wide"
              variant={isDark ? "dark" : "light"}
              previewType="dashboard"
              mockupTitle="Central Mission Control"
              mockupSubtitle="Sprint velocity, requirement statuses, and live risk metrics"
            />
          </div>

          {/* Top Left Floating Image (Sprint Board) */}
          <div className="hidden lg:block absolute -left-8 top-12 w-[34%] z-30 transform -rotate-3 hover:rotate-0 transition-transform duration-500 rounded-2xl bg-card border border-border p-2 shadow-2xl">
            <WebsiteImage
              imageKey="COLLAGE_SPRINT"
              alt="Sprint Cadence & Board"
              aspectRatio="wide"
              variant={isDark ? "dark" : "light"}
              previewType="board"
              mockupTitle="Sprint Execution Board"
              mockupSubtitle="Real-time ticket statuses and developer allocation"
            />
          </div>

          {/* Top Right Floating Image (Requirements Engine) */}
          <div className="hidden lg:block absolute -right-8 top-16 w-[34%] z-30 transform rotate-3 hover:rotate-0 transition-transform duration-500 rounded-2xl bg-card border border-border p-2 shadow-2xl">
            <WebsiteImage
              imageKey="COLLAGE_REQUIREMENTS"
              alt="Requirement Specification Traceability"
              aspectRatio="wide"
              variant={isDark ? "dark" : "light"}
              previewType="requirements"
              mockupTitle="Specification Hub"
              mockupSubtitle="Acceptance criteria and automated clarity checks"
            />
          </div>

          {/* Bottom Left Floating Image (Meeting Intelligence) */}
          <div className="hidden md:block absolute left-4 -bottom-10 w-[32%] z-30 transform -rotate-2 hover:rotate-0 transition-transform duration-500 rounded-2xl bg-card border border-border p-2 shadow-2xl">
            <WebsiteImage
              imageKey="COLLAGE_MEETING"
              alt="Meeting Intelligence & Decision Log"
              aspectRatio="wide"
              variant={isDark ? "dark" : "light"}
              previewType="meeting"
              mockupTitle="Meeting Action Log"
              mockupSubtitle="Extracted architectural decisions and task tickets"
            />
          </div>

          {/* Bottom Right Floating Image (AI Insights) */}
          <div className="hidden md:block absolute right-4 -bottom-12 w-[32%] z-30 transform rotate-2 hover:rotate-0 transition-transform duration-500 rounded-2xl bg-card border border-border p-2 shadow-2xl">
            <WebsiteImage
              imageKey="COLLAGE_AI"
              alt="AI Test Case & Anomaly Matrix"
              aspectRatio="wide"
              variant={isDark ? "dark" : "light"}
              previewType="ai"
              mockupTitle="QA & Test Matrix"
              mockupSubtitle="Structured test scenarios mapped to requirements"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
