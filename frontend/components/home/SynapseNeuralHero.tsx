"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles, Layers } from "lucide-react";
import { SYNAPSE_MODULES, SynapseModuleConfig } from "./synapse-modules";
import { SynapseNucleus } from "./SynapseNucleus";
import { NeuralConnections } from "./NeuralConnections";
import { ModuleNode } from "./ModuleNode";

export function SynapseNeuralHero() {
  const router = useRouter();
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [isNucleusHovered, setIsNucleusHovered] = useState(false);

  const handleModuleClick = useCallback(
    (mod: SynapseModuleConfig) => {
      if (mod.route) {
        router.push(mod.route);
      }
    },
    [router]
  );

  return (
    <header className="relative pt-10 sm:pt-14 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-between overflow-hidden">
      {/* 1. AMBIENT BACKGROUND GLOWS */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-[680px] h-[480px] rounded-full bg-gradient-to-b from-[#06858E]/12 via-[#1E9EA6]/6 to-transparent blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-[460px] h-[380px] rounded-full bg-[#C9E5E7]/25 blur-[100px]" />
        <div className="absolute top-1/3 right-10 w-[360px] h-[360px] rounded-full bg-[#0A4A55]/10 blur-[110px]" />
      </div>

      {/* 2. SIDE-BY-SIDE MAIN HERO GRID (Left: Copy & CTAs, Right: 3D Brain Stage) */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
        {/* LEFT COLUMN: HERO HEADLINE & COPY (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/80 dark:bg-card/50 backdrop-blur-md text-xs font-medium text-foreground mb-6 shadow-2xs">
            <span className="flex size-4 rounded bg-[#06858E] text-white items-center justify-center">
              <Check className="size-2.5 stroke-[3]" />
            </span>
            <span>Trusted by 4,000+ modern engineering teams</span>
          </div>

          {/* Editorial Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[56px] xl:text-[64px] font-normal tracking-[-0.04em] text-foreground leading-[1.04] mb-6">
            <span className="block font-medium">Project Management</span>
            <span className="block text-muted-foreground/75 font-light">
              <span className="font-normal italic mr-2 text-muted-foreground/60">that</span>
              <span className="font-semibold text-foreground">thinks ahead.</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-sm sm:text-base md:text-lg text-muted-foreground font-normal leading-relaxed mb-8">
            Synapse is the intelligent nucleus that connects every part of software project management into one coordinated system—helping teams anticipate risks, eliminate specification ambiguities, and ship on time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-[var(--button-primary-hover)] transition-all active:scale-[0.98]"
            >
              <span>Get Started Free</span>
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#preview"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium shadow-2xs transition-all"
            >
              <Sparkles className="size-4 text-[#06858E]" />
              <span>Explore Synapse</span>
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D CONNECTED BRAIN HERO VISUALIZATION (lg:col-span-7) */}
        <div
          id="brain-stage"
          aria-label="Interactive 3D Synapse AI Brain Network"
          className="lg:col-span-7 relative w-full flex flex-col items-center select-none"
        >
          {/* DESKTOP 800x600 RADIAL ARCHITECTURE STAGE */}
          <div className="relative w-full aspect-[800/600] max-w-[760px] hidden lg:block">
            {/* Dynamic SVG Neural Connections Layer */}
            <NeuralConnections
              modules={SYNAPSE_MODULES}
              activeModuleId={activeModuleId}
              isNucleusHovered={isNucleusHovered}
            />

            {/* Central 3D Synapse Brain Nucleus */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
              style={{ width: "320px", height: "320px" }}
            >
              <SynapseNucleus
                isHovered={isNucleusHovered}
                activeModuleId={activeModuleId}
                onHoverNucleus={setIsNucleusHovered}
              />
            </div>

            {/* 8 Small Connected Module Nodes */}
            {SYNAPSE_MODULES.map((mod) => {
              const leftPercent = `${(mod.desktopPos.x / 800) * 100}%`;
              const topPercent = `${(mod.desktopPos.y / 600) * 100}%`;
              const isActive = activeModuleId === mod.id;

              return (
                <div
                  key={mod.id}
                  className="absolute z-40 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                  style={{ left: leftPercent, top: topPercent }}
                >
                  <ModuleNode
                    module={mod}
                    isActive={isActive}
                    onHover={(hovered) => setActiveModuleId(hovered ? mod.id : null)}
                    onClick={() => handleModuleClick(mod)}
                  />
                </div>
              );
            })}
          </div>

          {/* TABLET & MOBILE RESPONSIVE STAGE (< lg screens) */}
          <div className="lg:hidden w-full flex flex-col items-center mt-4">
            {/* Centered 3D Rotating Nucleus */}
            <div className="relative size-[280px] sm:size-[320px] flex items-center justify-center">
              <SynapseNucleus
                isHovered={isNucleusHovered}
                activeModuleId={activeModuleId}
                onHoverNucleus={setIsNucleusHovered}
              />
            </div>

            {/* Connected Small Modules Grid below Nucleus */}
            <div className="w-full mt-6">
              <div className="flex items-center justify-between px-2 mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-[#06858E]" />
                  Connected Modules (8)
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Tap to explore
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SYNAPSE_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleModuleClick(mod)}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-xl bg-card border border-border/80 hover:border-[#06858E]/50 shadow-xs text-left transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {mod.shortName}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
