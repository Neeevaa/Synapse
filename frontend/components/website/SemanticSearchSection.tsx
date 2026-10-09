"use client";

import React, { useState, useEffect } from "react";
import { Search, Sparkles, FileText, Video, CheckSquare, BrainCircuit, ArrowRight } from "lucide-react";
import { WebsiteImage } from "./WebsiteImage";

export function SemanticSearchSection() {
  const [query, setQuery] = useState("Show me the requirements related to authentication");
  const [selectedFilter, setSelectedFilter] = useState("All");
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

  const filterChips = [
    { label: "All", count: 18 },
    { label: "Requirements", count: 6 },
    { label: "Meetings", count: 4 },
    { label: "Tasks", count: 5 },
    { label: "Knowledge", count: 2 },
    { label: "Decisions", count: 1 },
  ];

  const sampleResults = [
    {
      type: "Requirement",
      title: "REQ-104: Multi-Factor Authentication with Biometric Fallback",
      snippet: "Users must be prompted for WebAuthn passkey when logging in from unrecognized device fingerprints...",
      status: "Verified",
      icon: FileText,
      badge: "In Sprint 12",
    },
    {
      type: "Meeting Decision",
      title: "Security Architecture Review #4",
      snippet: "Agreed to use standard OIDC session tokens with 15-minute refresh rotation to avoid silent token replay...",
      status: "Approved",
      icon: Video,
      badge: "March 24",
    },
    {
      type: "Task",
      title: "SYN-392: Implement OAuth 2.0 PKCE Authorization Code Grant",
      snippet: "Refactored token exchange handler in authentication gateway to validate PKCE code_verifier...",
      status: "Done",
      icon: CheckSquare,
      badge: "PR #108",
    },
  ];

  return (
    <section id="search" className="relative bg-background py-24 sm:py-32 lg:py-40 border-b border-border text-foreground overflow-hidden transition-colors duration-200">
      {/* Background Ambient Radial Mesh */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-secondary/10 blur-[130px]" />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Editorial Heading */}
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-secondary mb-4 shadow-2xs">
            <BrainCircuit className="size-3.5 text-secondary" />
            <span>Semantic Knowledge Engine</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.08]">
            Find the context <br />
            behind your project.
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Query across requirements, past retrospectives, architecture decisions, and code deliverables using natural language.
          </p>
        </div>

        {/* LARGE SEARCH INPUT BAR */}
        <div className="mx-auto max-w-3xl mb-8">
          <div className="relative rounded-2xl bg-card border border-border shadow-2xl p-2 sm:p-2.5 flex items-center gap-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-all">
            <div className="pl-3 text-muted-foreground">
              <Search className="size-5" />
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your project knowledge..."
              className="flex-1 bg-transparent py-2.5 sm:py-3 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />

            <button
              onClick={() => {}}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md hover:bg-[var(--button-primary-hover)] transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="size-3.5" />
              <span>Query Context</span>
            </button>
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
          {filterChips.map((chip) => {
            const isSelected = selectedFilter === chip.label;
            return (
              <button
                key={chip.label}
                onClick={() => setSelectedFilter(chip.label)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <span>{chip.label}</span>
                <span className="ml-1.5 opacity-60">({chip.count})</span>
              </button>
            );
          })}
        </div>

        {/* DEMONSTRATION RESULT CARDS */}
        <div className="mx-auto max-w-3xl space-y-3.5 mb-16">
          {sampleResults.map((result, idx) => {
            const Icon = result.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl bg-card border border-border p-4 sm:p-5 hover:border-primary/50 transition-all duration-200 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-secondary bg-secondary/15 px-2 py-0.5 rounded border border-secondary/30">
                      <Icon className="size-3" />
                      {result.type}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{result.badge}</span>
                  </div>
                  <span className="text-xs font-medium text-secondary flex items-center gap-1 font-semibold">
                    {result.status}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">
                  {result.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {result.snippet}
                </p>
              </div>
            );
          })}
        </div>

        {/* COMPREHENSIVE KNOWLEDGE GRAPH PRODUCT IMAGE */}
        <div className="mx-auto max-w-5xl rounded-3xl bg-card border border-border p-3 sm:p-6 shadow-2xl">
          <WebsiteImage
            imageKey="KNOWLEDGE_SEARCH_IMAGE"
            alt="Synapse Connected Knowledge Graph"
            aspectRatio="wide"
            variant={isDark ? "dark" : "light"}
            previewType="search"
            mockupTitle="Semantic Knowledge Matrix"
            mockupSubtitle="Instant natural language queries across your software ecosystem"
            className="rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
}
