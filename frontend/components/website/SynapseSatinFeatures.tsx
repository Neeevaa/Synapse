"use client";

import React, { useState, useCallback } from "react";
import {
  FileCheck2,
  GitPullRequest,
  Search,
  AlertTriangle,
  MessageSquareCode,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export function SynapseSatinFeatures() {
  const [mousePos, setMousePos] = useState({ x: "80%", y: "20%" });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x: `${x.toFixed(1)}%`, y: `${y.toFixed(1)}%` });
  }, []);

  const features = [
    {
      icon: FileCheck2,
      tag: "Specification Analysis",
      title: "AI Requirement Checker",
      desc: "Evaluates acceptance criteria and user stories against historical context to highlight ambiguities and unstated assumptions before development starts.",
      highlight: "Traceable & Context-Aware",
    },
    {
      icon: Search,
      tag: "Semantic Search",
      title: "Context-Aware Knowledge Graph",
      desc: "Instant semantic retrieval across team documentation, meeting transcripts, and sprint history without searching through disconnected folders.",
      highlight: "Sub-Second Retrieval",
    },
    {
      icon: AlertTriangle,
      tag: "Risk Prevention",
      title: "Dependency & Delay Predictor",
      desc: "Traces cross-team dependency paths and emerging blockers, alerting managers to potential ripple effects ahead of release schedules.",
      highlight: "Early Bottleneck Detection",
    },
    {
      icon: GitPullRequest,
      tag: "Execution Pipeline",
      title: "Sprint & Task Coordination",
      desc: "Connects product backlogs, sprint pipelines, code reviews, and capacity tracking into one seamless workflow without manual spreadsheet syncing.",
      highlight: "Continuous Alignment",
    },
    {
      icon: MessageSquareCode,
      tag: "Collaboration Intelligence",
      title: "Meeting Intelligence & Takeaways",
      desc: "Converts meeting transcripts into concrete architectural decisions, auto-linked tasks, and documented commitments with full human review.",
      highlight: "Actionable Summaries",
    },
    {
      icon: ShieldCheck,
      tag: "Governance & Control",
      title: "Human Oversight Guarantee",
      desc: "AI acts strictly as an assistant—surfacing insights and recommendations while keeping human engineers firmly in control of all project decisions.",
      highlight: "100% User Control",
    },
  ];

  return (
    <section
      id="capabilities"
      onPointerMove={handlePointerMove}
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* SATIN FEATURE PANEL WRAPPER (Signature 21st.dev style) */}
        <div className="relative rounded-3xl p-6 sm:p-10 lg:p-16 border border-border bg-[#0B2220] text-[#F4FAF7] overflow-hidden shadow-2xl shadow-black/40">
          {/* Animated Satin Wave Canvas Background */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <svg
              className="w-full h-full object-cover opacity-35 dark:opacity-45"
              viewBox="0 0 1200 700"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="satin-ribbon-grad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#0B2220" stopOpacity="0" />
                  <stop offset="0.3" stopColor="#258663" stopOpacity="0.5" />
                  <stop offset="0.55" stopColor="#A8D6CF" stopOpacity="0.8" />
                  <stop offset="0.8" stopColor="#258663" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#0B2220" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="satin-sun" cx="0.9" cy="0.1" r="0.6">
                  <stop offset="0" stopColor="#A8D6CF" stopOpacity="0.6" />
                  <stop offset="0.4" stopColor="#258663" stopOpacity="0.3" />
                  <stop offset="1" stopColor="#0B2220" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="1200" height="700" fill="url(#satin-sun)" />

              {/* Undulating Satin Ribbons */}
              <g className="satin-anim-a">
                <path
                  d="M-100 600 C 180 500, 380 400, 640 240 S 1040 30, 1340 -50 L 1340 120 C 1060 180, 840 340, 620 480 S 180 730, -100 810 Z"
                  fill="url(#satin-ribbon-grad)"
                />
              </g>

              <g className="satin-anim-b">
                <path
                  d="M-50 680 C 250 540, 480 410, 710 250 S 1090 50, 1310 -10 L 1310 80 C 1050 140, 830 290, 610 420 S 210 650, -50 740 Z"
                  fill="url(#satin-ribbon-grad)"
                  opacity="0.65"
                />
              </g>
            </svg>

            {/* Interactive Spotlight following cursor */}
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                background: `radial-gradient(550px circle at ${mousePos.x} ${mousePos.y}, rgba(37, 134, 99, 0.28), transparent 70%)`,
              }}
            />
          </div>

          {/* Section Header inside Satin Panel */}
          <div className="relative z-10 max-w-2xl mb-12 sm:mb-16">
            <span className="text-xs font-mono tracking-[0.25em] uppercase text-[#A8D6CF] font-bold">
              Our Capabilities
            </span>
            <h2 className="text-3xl sm:text-5xl font-normal tracking-tight text-white leading-[1.05] mt-2 mb-4">
              Essential <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F4FAF7] to-[#A8D6CF]">Tools For Modern</span> Engineering.
            </h2>
            <p className="text-sm sm:text-base text-[#D5EEE4]/80 leading-relaxed">
              Moving beyond passive status tracking to context-aware, proactive coordination across your entire software lifecycle.
            </p>
          </div>

          {/* Bento Feature Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#258663]/50 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    {/* Top Icon & Tag */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="size-10 rounded-xl bg-[#258663]/30 text-[#A8D6CF] flex items-center justify-center border border-[#258663]/40 group-hover:bg-[#258663] group-hover:text-white transition-colors">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#A8D6CF]/80 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#A8D6CF] transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#D5EEE4]/75 leading-relaxed mb-6">
                      {feat.desc}
                    </p>
                  </div>

                  {/* Bottom Metric Tag */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#A8D6CF]">
                    <span>{feat.highlight}</span>
                    <ArrowRight className="size-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
