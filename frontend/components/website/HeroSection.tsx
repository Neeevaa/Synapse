"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ChevronRight } from "lucide-react";
import { WEBSITE_IMAGES } from "./constants";
import { WebsiteImage } from "./WebsiteImage";

export function HeroSection() {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgError, setBgError] = useState(false);
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
    <section className="relative min-h-[920px] lg:min-h-screen flex flex-col justify-between pt-32 sm:pt-36 lg:pt-40 overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* BACKGROUND IMAGE WITH CINEMATIC DUAL-THEME OVERLAY */}
      <div className="absolute inset-0 z-0">
        {!bgError && (
          <Image
            src={WEBSITE_IMAGES.HERO_BACKGROUND_IMAGE}
            alt="Synapse Engineering Workspace"
            fill
            priority
            sizes="100vw"
            className={`object-cover object-center transition-opacity duration-1000 ${
              bgLoaded ? "opacity-25 dark:opacity-35" : "opacity-0"
            }`}
            onLoad={() => setBgLoaded(true)}
            onError={() => setBgError(true)}
          />
        )}

        {/* Ambient Gradient Mesh Fallback & Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/65 to-background" />

        {/* Soft Radial Center Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--primary)_25%,transparent)_0%,var(--background)_70%)]" />

        {/* Delicate Grid Lines for Precision Feel */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* HERO COPY & HEADLINE (CENTERED) */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 text-center flex-1 flex flex-col justify-center items-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold tracking-wider text-secondary backdrop-blur-md uppercase mb-6 sm:mb-8 hover:border-primary/40 transition-colors shadow-2xs">
          <Sparkles className="size-3.5 text-secondary" />
          <span>AI-Powered Project Intelligence</span>
        </div>

        {/* Main Heading (Responsive scale: 42-96px) */}
        <h1 className="max-w-5xl text-4xl sm:text-6xl md:text-7xl lg:text-[84px] xl:text-[92px] font-extrabold tracking-[-0.035em] text-foreground leading-[1.04] mb-6 sm:mb-8">
          Turn every project <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
            into a coordinated system.
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground font-normal leading-relaxed mb-8 sm:mb-10">
          Synapse brings planning, requirements, collaboration, and AI-powered project intelligence into one connected workspace.
        </p>

        {/* CTA Button Group */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full sm:w-auto">
          <Link
            href="/register"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-[var(--button-primary-hover)] transition-all duration-200 active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="size-4.5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="#showcase"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-7 py-4 text-base font-medium text-foreground hover:bg-card hover:border-primary/40 transition-all duration-200 backdrop-blur-sm"
          >
            <span>Explore Synapse</span>
            <ChevronRight className="size-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* OVERLAPPING HERO PRODUCT MOCKUPS COMPOSITION */}
      <div className="relative z-20 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 mt-14 sm:mt-16 lg:mt-20">
        <div className="relative mx-auto max-w-5xl">
          {/* Subtle Glow Behind Floating Mockups */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

          {/* Composition Container with 3 Overlapping Mockups */}
          <div className="relative flex items-center justify-center pt-4 pb-2 translate-y-6 sm:translate-y-10 lg:translate-y-14">
            {/* Left Mockup (Tilted -3 deg, behind center) */}
            <div className="hidden md:block absolute -left-6 lg:-left-12 bottom-6 w-[42%] transform -rotate-3 hover:rotate-0 transition-transform duration-500 z-10 opacity-75 hover:opacity-100 hover:z-30">
              <WebsiteImage
                imageKey="HERO_PRODUCT_MOCKUP_02"
                alt="Synapse Sprint Execution Overview"
                aspectRatio="wide"
                variant={isDark ? "dark" : "light"}
                previewType="board"
                mockupTitle="Sprint Backlog & Velocity"
                mockupSubtitle="Sprint board with automated status transitions"
                className="hover:scale-[1.02] transition-transform duration-300"
              />
            </div>

            {/* Central Main Mockup (Large, floating, dominant) */}
            <div className="relative w-full md:w-[78%] lg:w-[74%] z-20 shadow-2xl shadow-black/30 hover:scale-[1.01] transition-transform duration-500">
              <WebsiteImage
                imageKey="HERO_PRODUCT_MOCKUP_01"
                alt="Synapse Central Workspace Board"
                aspectRatio="wide"
                variant={isDark ? "dark" : "light"}
                priority
                previewType="hero"
                mockupTitle="Unified Engineering Canvas"
                mockupSubtitle="Active sprint, live requirement status, and AI insights"
                className="hover:scale-[1.02] transition-transform duration-300"
              />
            </div>

            {/* Right Mockup (Tilted +3 deg, behind center) */}
            <div className="hidden md:block absolute -right-6 lg:-right-12 bottom-6 w-[42%] transform rotate-3 hover:rotate-0 transition-transform duration-500 z-10 opacity-75 hover:opacity-100 hover:z-30">
              <WebsiteImage
                imageKey="HERO_PRODUCT_MOCKUP_03"
                alt="Synapse Meeting Intelligence"
                aspectRatio="wide"
                variant={isDark ? "dark" : "light"}
                previewType="meeting"
                mockupTitle="Meeting Context & Action Items"
                mockupSubtitle="Automated decision extraction and risk identification"
                className="hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TRANSITION OVERLAY INTO NEXT SECTION */}
      <div className="h-12 sm:h-20 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
