"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="relative bg-[#0B1015] py-28 sm:py-36 lg:py-48 text-white overflow-hidden">
      
      {/* SUBTLE CIRCULAR CONSTELLATION / NETWORK VISUAL BEHIND CTA */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        
        {/* Soft Radial Ambient Glow */}
        <div className="size-[500px] sm:size-[650px] rounded-full bg-[#2D7A5B]/15 blur-[120px]" />

        {/* Constellation Orbit Rings and Connected Nodes */}
        <div className="absolute size-[340px] sm:size-[520px] lg:size-[680px] rounded-full border border-white/[0.06] animate-[spin_120s_linear_infinite]">
          {/* Constellation Particle Dots */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 size-2 rounded-full bg-[#3F9B73]/60 shadow-[0_0_12px_#3F9B73]" />
          <div className="absolute bottom-1/4 right-0 size-1.5 rounded-full bg-white/40" />
          <div className="absolute top-1/3 left-2 size-2 rounded-full bg-[#2D7A5B]/70" />
          <div className="absolute bottom-10 left-1/4 size-1.5 rounded-full bg-white/50" />
        </div>

        <div className="absolute size-[240px] sm:size-[380px] lg:size-[500px] rounded-full border border-dashed border-white/[0.08] animate-[spin_80s_linear_infinite_reverse]">
          <div className="absolute top-1/4 right-4 size-2 rounded-full bg-[#3F9B73]/70" />
          <div className="absolute bottom-2 left-1/3 size-1.5 rounded-full bg-white/40" />
          <div className="absolute top-2 left-1/4 size-2 rounded-full bg-white/30" />
        </div>

        {/* Inner Dense Data Spherical Mesh (Visual from reference) */}
        <svg
          viewBox="0 0 600 600"
          className="absolute size-[380px] sm:size-[580px] lg:size-[720px] opacity-25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="300" cy="300" r="260" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="300" cy="300" r="190" stroke="rgba(45,122,91,0.25)" strokeWidth="1" />
          <circle cx="300" cy="300" r="120" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />
          
          {/* Subtle connecting constellation line traces */}
          <line x1="140" y1="200" x2="300" y2="110" stroke="rgba(63,155,115,0.2)" strokeWidth="1" />
          <line x1="300" y1="110" x2="460" y2="210" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <line x1="460" y1="210" x2="430" y2="410" stroke="rgba(63,155,115,0.2)" strokeWidth="1" />
          <line x1="430" y1="410" x2="210" y2="430" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <line x1="210" y1="430" x2="140" y2="200" stroke="rgba(45,122,91,0.25)" strokeWidth="1" />

          {/* Node points */}
          <circle cx="140" cy="200" r="3" fill="#3F9B73" />
          <circle cx="300" cy="110" r="3.5" fill="#FFFFFF" />
          <circle cx="460" cy="210" r="3" fill="#3F9B73" />
          <circle cx="430" cy="410" r="3.5" fill="#FFFFFF" />
          <circle cx="210" cy="430" r="3" fill="#3F9B73" />
        </svg>

      </div>

      {/* CONTENT (CENTERED OVER NETWORK VISUAL) */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 text-center">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-[#3F9B73] backdrop-blur-md mb-6">
          <Sparkles className="size-3.5" />
          <span>Synchronized Software Delivery</span>
        </div>

        {/* Main CTA Heading */}
        <h2 className="max-w-4xl mx-auto text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 sm:mb-8 leading-[1.05]">
          Build projects <br />
          with more clarity.
        </h2>

        {/* Supporting Copy */}
        <p className="max-w-xl mx-auto text-base sm:text-lg md:text-xl text-white/70 font-normal leading-relaxed mb-10 sm:mb-12">
          Start building a more connected way to manage software projects.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto">
          <Link
            href="/register"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#2D7A5B] px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[#2D7A5B]/30 hover:bg-[#3F9B73] hover:shadow-[#3F9B73]/40 transition-all duration-200 active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="size-4.5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="#showcase"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-7 py-4 text-base font-medium text-white hover:bg-white/[0.1] hover:border-white/40 transition-all duration-200 backdrop-blur-sm"
          >
            <span>Explore Synapse</span>
            <ChevronRight className="size-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

      </div>
    </section>
  );
}
