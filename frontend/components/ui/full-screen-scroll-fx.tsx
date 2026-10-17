"use client";

import React, { useEffect, useRef, useState, useCallback, useId, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Activity,
  ArrowDown,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerBooleanSnapshot() {
  return false;
}

export interface ScrollFXSection {
  id: string;
  num?: string;
  leftLabel: string;
  centerHeadline: string;
  rightLabel: string;
  supportingMessage?: string;
  eyebrow?: string;
  backgroundImage: string;
  badge?: string;
  metric?: {
    label: string;
    value: string;
  };
  primaryCta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  tags?: string[];
}

export interface FullScreenScrollFXProps {
  sections: ScrollFXSection[];
  activeIndex?: number;
  onSectionChange?: (index: number) => void;
  className?: string;
  enableKeyboardNavigation?: boolean;
}

export function FullScreenScrollFX({
  sections = [],
  activeIndex: controlledIndex,
  onSectionChange,
  className = "",
  enableKeyboardNavigation = true,
}: FullScreenScrollFXProps) {
  const componentId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  // Uncontrolled state when activeIndex prop is undefined
  const [uncontrolledIndex, setUncontrolledIndex] = useState(0);
  const currentIndex = controlledIndex !== undefined ? controlledIndex : uncontrolledIndex;

  const [isNavigatingDirectly, setIsNavigatingDirectly] = useState(false);

  // Subscribe to external browser APIs using useSyncExternalStore (React 18/19 native)
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerBooleanSnapshot
  );

  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerBooleanSnapshot
  );

  // Safe navigation function
  const goTo = useCallback(
    (targetIndex: number, smooth: boolean = true) => {
      if (!sections || sections.length === 0) return;
      const safeIndex = Math.max(0, Math.min(sections.length - 1, targetIndex));

      const st = scrollTriggerRef.current;
      if (st) {
        setIsNavigatingDirectly(true);
        const totalDistance = st.end - st.start;
        const progressFraction = sections.length > 1 ? safeIndex / (sections.length - 1) : 0;
        const targetScroll = st.start + progressFraction * totalDistance;

        if (smooth && !prefersReducedMotion) {
          window.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
        } else {
          window.scrollTo({
            top: targetScroll,
            behavior: "auto",
          });
        }

        setTimeout(() => {
          setIsNavigatingDirectly(false);
        }, 600);
      }

      setUncontrolledIndex(safeIndex);
      onSectionChange?.(safeIndex);
    },
    [sections, onSectionChange, prefersReducedMotion]
  );

  const next = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const prev = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNavigation || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const st = scrollTriggerRef.current;
      if (!st) return;

      const currentScroll = window.scrollY;
      const isInViewport = currentScroll >= st.start - 80 && currentScroll <= st.end + 80;
      if (!isInViewport) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === "PageDown" || (e.key === "ArrowDown" && e.altKey)) {
        e.preventDefault();
        next();
      } else if (e.key === "PageUp" || (e.key === "ArrowUp" && e.altKey)) {
        e.preventDefault();
        prev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardNavigation, next, prev]);

  // Handle URL hash changes (e.g. #visibility, #clarity, #workflow, etc.)
  useEffect(() => {
    if (typeof window === "undefined" || sections.length === 0) return;
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const targetIdx = sections.findIndex((s) => s.id === hash);
      if (targetIdx !== -1) {
        goTo(targetIdx);
      }
    };
    window.addEventListener("hashchange", handleHash);
    if (window.location.hash) {
      handleHash();
    }
    return () => window.removeEventListener("hashchange", handleHash);
  }, [sections, goTo]);

  // GSAP ScrollTrigger Setup
  useEffect(() => {
    if (typeof window === "undefined" || !wrapperRef.current || !pinTargetRef.current) return;
    if (sections.length === 0) return;

    const totalSections = sections.length;
    // Pinned distance: (totalSections - 1) * 100vh
    const scrollDistance = Math.max(1, (totalSections - 1) * window.innerHeight);

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: wrapperRef.current,
        pin: pinTargetRef.current,
        start: "top top",
        end: () => `+=${scrollDistance}`,
        scrub: prefersReducedMotion ? false : 0.6,
        snap:
          totalSections > 1 && !prefersReducedMotion
            ? {
                snapTo: 1 / (totalSections - 1),
                duration: { min: 0.25, max: 0.6 },
                ease: "power2.out",
                delay: 0.1,
              }
            : undefined,
        onUpdate: (self) => {
          if (isNavigatingDirectly) return;
          const progress = self.progress;
          const calculatedIndex = Math.min(
            totalSections - 1,
            Math.max(0, Math.round(progress * (totalSections - 1)))
          );
          setUncontrolledIndex(calculatedIndex);
          onSectionChange?.(calculatedIndex);
        },
      });

      scrollTriggerRef.current = st;

      const handleResize = () => {
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", handleResize);

      if ("fonts" in document) {
        document.fonts.ready.then(() => {
          ScrollTrigger.refresh();
        });
      }

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, wrapperRef);

    return () => {
      ctx.revert();
      scrollTriggerRef.current = null;
    };
  }, [sections.length, prefersReducedMotion, isNavigatingDirectly, onSectionChange]);

  // Handle empty state safely
  if (!sections || sections.length === 0) {
    return null;
  }

  const currentSection = sections[currentIndex] || sections[0];

  return (
    <div
      ref={wrapperRef}
      id={`scroll-fx-container-${componentId}`}
      className={`relative w-full transition-colors duration-300 select-none ${
        isDark ? "bg-[#071716] text-[#F4FAF7]" : "bg-[#F4FAF7] text-[#173D3A]"
      } ${className}`}
      style={{
        height: `${Math.max(1, sections.length) * 100}vh`,
      }}
    >
      {/* PINNED VIEWPORT STAGE */}
      <div
        ref={pinTargetRef}
        className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col justify-between"
      >
        {/* 1. BACKGROUND LAYERS STACK */}
        <div className="absolute inset-0 z-0">
          {sections.map((section, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={section.id || idx}
                className={`absolute inset-0 transition-opacity ease-out ${
                  isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                style={{
                  transitionProperty: "opacity, transform",
                  transitionDuration: prefersReducedMotion ? "200ms" : "750ms",
                  transform:
                    isActive || prefersReducedMotion
                      ? "scale(1)"
                      : idx < currentIndex
                      ? "scale(0.97)"
                      : "scale(1.03)",
                }}
              >
                {/* Background Image */}
                <Image
                  src={section.backgroundImage}
                  alt={`${section.centerHeadline} visual background`}
                  fill
                  priority={idx <= 1}
                  sizes="100vw"
                  className="object-cover object-center"
                />

                {/* Theme-Aware Atmospheric Overlays for Optimal Legibility */}
                {isDark ? (
                  <>
                    {/* Dark Theme: Deep Ocean Vignette Tint */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#051413]/95 via-[#071816]/75 to-[#071816]/90" />
                    {/* Dark Theme: Ambient Radial Glow from Center */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(37,134,99,0.22)_0%,rgba(7,23,22,0.85)_70%)]" />
                  </>
                ) : (
                  <>
                    {/* Light Theme: Fresh Sage/Pastel Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F4FAF7]/95 via-[#F4FAF7]/75 to-[#F4FAF7]/90" />
                    {/* Light Theme: Subtle Radial Soft Center */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(168,214,207,0.35)_0%,rgba(244,250,247,0.85)_75%)]" />
                  </>
                )}

                {/* Delicate Precision Grid */}
                <div
                  className="absolute inset-0 opacity-[0.035] pointer-events-none"
                  style={{
                    backgroundImage: isDark
                      ? `linear-gradient(to right, #258663 1px, transparent 1px), linear-gradient(to bottom, #258663 1px, transparent 1px)`
                      : `linear-gradient(to right, #173D3A 1px, transparent 1px), linear-gradient(to bottom, #173D3A 1px, transparent 1px)`,
                    backgroundSize: "48px 48px",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 2. TOP BRAND ACCENT BAR & SPACING FOR FIXED HEADER */}
        <div className="relative z-20 pt-24 sm:pt-28 px-6 sm:px-10 lg:px-16 flex items-center justify-between">
          {/* Eyebrow Breadcrumb / Category Tracker */}
          <div className="flex items-center gap-2.5">
            <span
              className={`flex size-2 rounded-full animate-pulse ${
                isDark ? "bg-[#258663]" : "bg-[#258663]"
              }`}
            />
            <span
              className={`font-mono text-[11px] sm:text-xs tracking-[0.2em] uppercase font-semibold ${
                isDark ? "text-[#A8D6CF]" : "text-[#258663]"
              }`}
            >
              {currentSection.badge || "SYNAPSE PLATFORM TOUR"}
            </span>
          </div>

          {/* Numerical Step Counter (e.g. 01 / 06) */}
          <div
            className={`font-mono text-xs sm:text-sm tracking-wider px-3.5 py-1 rounded-full border backdrop-blur-md shadow-2xs ${
              isDark
                ? "bg-[#103A38]/70 text-[#A8D6CF] border-[#258663]/40"
                : "bg-white/80 text-[#173D3A] border-[#D2E7DF]"
            }`}
          >
            <span className="font-bold">{currentSection.num || `0${currentIndex + 1}`}</span>
            <span className="mx-1.5 opacity-60 font-light">/</span>
            <span className="opacity-75">{sections.length < 10 ? `0${sections.length}` : sections.length}</span>
          </div>
        </div>

        {/* 3. MAIN CINEMATIC STAGE (TRIPARTITE: LEFT LABELS — CENTER HERO — RIGHT LABELS) */}
        <div className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center px-6 sm:px-10 lg:px-16 gap-6 max-w-[1720px] mx-auto w-full">
          {/* LEFT-SIDE LABELS (Desktop 3 cols) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-3 py-4">
            <div
              className={`text-[10px] font-mono tracking-[0.25em] uppercase mb-2 font-bold ${
                isDark ? "text-[#526F67]" : "text-[#526F67]"
              }`}
            >
              Key Dimensions
            </div>
            <div className="flex flex-col gap-2.5" role="tablist" aria-label="Section Left Dimensions">
              {sections.map((section, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={`left-${section.id || idx}`}
                    role="tab"
                    id={`tab-left-${idx}`}
                    aria-selected={isActive}
                    tabIndex={0}
                    onClick={() => goTo(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goTo(idx);
                      }
                    }}
                    className={`group text-left flex items-center gap-3.5 transition-all duration-300 py-2 px-3.5 rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#258663] ${
                      isActive
                        ? isDark
                          ? "bg-[#103A38]/90 text-white shadow-md shadow-[#258663]/20 border border-[#258663]/30"
                          : "bg-white text-[#173D3A] shadow-md shadow-black/5 border border-[#D2E7DF]"
                        : isDark
                        ? "text-[#A8D6CF]/60 hover:text-white hover:bg-[#103A38]/30"
                        : "text-[#526F67]/75 hover:text-[#173D3A] hover:bg-white/60"
                    }`}
                  >
                    {/* Active Bar Indicator */}
                    <div
                      className={`h-4 w-1 rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-[#258663] h-5 scale-100"
                          : isDark
                          ? "bg-transparent group-hover:bg-[#258663]/40"
                          : "bg-transparent group-hover:bg-[#258663]/30"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] opacity-70 font-medium">
                        {section.num || `0${idx + 1}`}
                      </span>
                      <span
                        className={`text-xs xl:text-sm font-bold tracking-[0.14em] uppercase transition-colors ${
                          isActive
                            ? isDark
                              ? "text-[#E8FAF4]"
                              : "text-[#173D3A]"
                            : isDark
                            ? "text-[#A8D6CF]/70 group-hover:text-white"
                            : "text-[#526F67] group-hover:text-[#173D3A]"
                        }`}
                      >
                        {section.leftLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER HERO COPY & TYPOGRAPHY (Desktop 6 cols, Mobile Full) */}
          <div className="lg:col-span-6 flex flex-col items-center text-center justify-center py-6 sm:py-8 max-w-2xl mx-auto w-full">
            {/* Center Eyebrow Pill */}
            {currentSection.eyebrow && (
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider backdrop-blur-md uppercase mb-4 sm:mb-6 shadow-2xs ${
                  isDark
                    ? "border-[#258663]/40 bg-[#103A38]/70 text-[#A8D6CF]"
                    : "border-[#D2E7DF] bg-white/80 text-[#258663]"
                }`}
              >
                <Sparkles className="size-3.5 text-[#258663]" />
                <span>{currentSection.eyebrow}</span>
              </div>
            )}

            {/* Giant Central Headline with Staggered Fade/Slide Effect */}
            <h2
              key={`headline-${currentIndex}`}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-[-0.035em] leading-[1.05] mb-5 sm:mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
            >
              <span
                className={`text-transparent bg-clip-text ${
                  isDark
                    ? "bg-gradient-to-r from-white via-[#F4FAF7] to-[#A8D6CF]"
                    : "bg-gradient-to-r from-[#173D3A] via-[#1F544F] to-[#258663]"
                }`}
              >
                {currentSection.centerHeadline}
              </span>
            </h2>

            {/* Supporting Descriptive Narrative */}
            {currentSection.supportingMessage && (
              <p
                key={`msg-${currentIndex}`}
                className={`max-w-xl text-sm sm:text-base md:text-lg font-normal leading-relaxed mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 ${
                  isDark ? "text-[#D5EEE4]/85" : "text-[#526F67]"
                }`}
              >
                {currentSection.supportingMessage}
              </p>
            )}

            {/* Optional Metric Pill or Highlight */}
            {currentSection.metric && (
              <div
                key={`metric-${currentIndex}`}
                className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md mb-6 animate-in fade-in duration-300 ${
                  isDark
                    ? "bg-[#0E2F2C]/80 border-[#258663]/40 text-[#A8D6CF]"
                    : "bg-white/85 border-[#D2E7DF] text-[#173D3A] shadow-xs"
                }`}
              >
                <Activity className="size-4 text-[#258663]" />
                <span className="text-xs font-mono opacity-80">{currentSection.metric.label}:</span>
                <span className="text-xs font-bold tracking-wide">{currentSection.metric.value}</span>
              </div>
            )}

            {/* CTAs (Prominent on Section 6 or configured sections) */}
            {currentSection.primaryCta && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <Link
                  href={currentSection.primaryCta.href}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#258663] px-7 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#258663]/25 hover:bg-[#1C6F51] transition-all duration-200 active:scale-[0.98]"
                >
                  <span>{currentSection.primaryCta.text}</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                {currentSection.secondaryCta && (
                  <a
                    href={currentSection.secondaryCta.href}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-sm sm:text-base font-medium transition-all duration-200 backdrop-blur-sm ${
                      isDark
                        ? "border-[#258663]/40 bg-[#103A38]/50 text-[#E8FAF4] hover:bg-[#103A38] hover:border-[#258663]"
                        : "border-[#D2E7DF] bg-white/80 text-[#173D3A] hover:bg-white hover:border-[#258663]"
                    }`}
                  >
                    <span>{currentSection.secondaryCta.text}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* RIGHT-SIDE LABELS (Desktop 3 cols) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col items-end gap-3 py-4 text-right">
            <div
              className={`text-[10px] font-mono tracking-[0.25em] uppercase mb-2 font-bold ${
                isDark ? "text-[#526F67]" : "text-[#526F67]"
              }`}
            >
              Capabilities
            </div>
            <div className="flex flex-col gap-2.5 w-full items-end" role="tablist" aria-label="Section Right Capabilities">
              {sections.map((section, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={`right-${section.id || idx}`}
                    role="tab"
                    id={`tab-right-${idx}`}
                    aria-selected={isActive}
                    tabIndex={0}
                    onClick={() => goTo(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goTo(idx);
                      }
                    }}
                    className={`group text-right flex items-center justify-end gap-3.5 transition-all duration-300 py-2 px-3.5 rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#258663] ${
                      isActive
                        ? isDark
                          ? "bg-[#103A38]/90 text-white shadow-md shadow-[#258663]/20 border border-[#258663]/30"
                          : "bg-white text-[#173D3A] shadow-md shadow-black/5 border border-[#D2E7DF]"
                        : isDark
                        ? "text-[#A8D6CF]/60 hover:text-white hover:bg-[#103A38]/30"
                        : "text-[#526F67]/75 hover:text-[#173D3A] hover:bg-white/60"
                    }`}
                  >
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-[10px] opacity-70 font-medium">
                        MOD.{section.num || `0${idx + 1}`}
                      </span>
                      <span
                        className={`text-xs xl:text-sm font-bold tracking-[0.14em] uppercase transition-colors ${
                          isActive
                            ? isDark
                              ? "text-[#E8FAF4]"
                              : "text-[#173D3A]"
                            : isDark
                            ? "text-[#A8D6CF]/70 group-hover:text-white"
                            : "text-[#526F67] group-hover:text-[#173D3A]"
                        }`}
                      >
                        {section.rightLabel}
                      </span>
                    </div>
                    {/* Active Bar Indicator */}
                    <div
                      className={`h-4 w-1 rounded-full transition-all duration-300 ${
                        isActive
                          ? "bg-[#258663] h-5 scale-100"
                          : isDark
                          ? "bg-transparent group-hover:bg-[#258663]/40"
                          : "bg-transparent group-hover:bg-[#258663]/30"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MOBILE SECTION SWITCHER BAR (Below hero on small screens) */}
        <div className="lg:hidden relative z-20 px-4 py-2 flex items-center justify-center gap-1.5 overflow-x-auto">
          {sections.map((section, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={`mobile-${section.id || idx}`}
                onClick={() => goTo(idx)}
                className={`px-3 py-1 text-xs font-mono rounded-full border transition-all ${
                  isActive
                    ? "bg-[#258663] border-[#258663] text-white font-bold"
                    : isDark
                    ? "bg-[#103A38]/60 border-[#258663]/20 text-[#A8D6CF]/70"
                    : "bg-white/80 border-[#D2E7DF] text-[#526F67]"
                }`}
              >
                {section.leftLabel}
              </button>
            );
          })}
        </div>

        {/* 4. BOTTOM PROGRESS BAR & NAVIGATION CONTROLS */}
        <div className="relative z-20 pb-6 sm:pb-8 px-6 sm:px-10 lg:px-16 flex items-center justify-between">
          {/* Previous / Next Arrow Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Previous Section"
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                currentIndex === 0
                  ? "opacity-30 cursor-not-allowed text-gray-500 bg-transparent border-transparent"
                  : isDark
                  ? "text-[#A8D6CF] bg-[#103A38]/70 border-[#258663]/30 hover:bg-[#258663] hover:text-white cursor-pointer active:scale-95"
                  : "text-[#173D3A] bg-white/80 border-[#D2E7DF] hover:bg-[#258663] hover:text-white hover:border-[#258663] cursor-pointer active:scale-95"
              }`}
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              onClick={next}
              disabled={currentIndex === sections.length - 1}
              aria-label="Next Section"
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                currentIndex === sections.length - 1
                  ? "opacity-30 cursor-not-allowed text-gray-500 bg-transparent border-transparent"
                  : isDark
                  ? "text-[#A8D6CF] bg-[#103A38]/70 border-[#258663]/30 hover:bg-[#258663] hover:text-white cursor-pointer active:scale-95"
                  : "text-[#173D3A] bg-white/80 border-[#D2E7DF] hover:bg-[#258663] hover:text-white hover:border-[#258663] cursor-pointer active:scale-95"
              }`}
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          {/* Central Progress Bar Track */}
          <div className="hidden sm:flex flex-col items-center gap-2 max-w-md w-full mx-6">
            <div
              className={`w-full h-1.5 rounded-full overflow-hidden border ${
                isDark ? "bg-[#103A38]/80 border-[#258663]/20" : "bg-[#D5EEE4]/60 border-[#D2E7DF]"
              }`}
            >
              <div
                className="bg-gradient-to-r from-[#258663] to-[#A8D6CF] h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((currentIndex + 1) / sections.length) * 100}%`,
                }}
              />
            </div>
            <span
              className={`text-[11px] font-mono tracking-wider ${
                isDark ? "text-[#A8D6CF]/70" : "text-[#526F67]"
              }`}
            >
              {currentIndex === 0
                ? "Scroll down to journey through Synapse"
                : currentIndex === sections.length - 1
                ? "Final Section: Think Ahead. Ready to begin? Click Get Started Free."
                : `Section ${currentIndex + 1} of ${sections.length}: ${currentSection.centerHeadline}`}
            </span>
          </div>

          {/* Direct jump to final section or action */}
          <div>
            {currentIndex === sections.length - 1 ? (
              <Link
                href="/register"
                className="text-xs font-mono px-4 py-1.5 rounded-xl bg-[#258663] text-white hover:bg-[#1C6F51] transition-all inline-flex items-center gap-1.5 shadow-md shadow-[#258663]/30 font-semibold"
              >
                <span>Get Started</span>
                <ArrowRight className="size-3" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => goTo(sections.length - 1)}
                className={`text-xs font-mono px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? "text-[#A8D6CF]/80 hover:text-white border-[#258663]/30 bg-[#103A38]/50 hover:border-[#258663]"
                    : "text-[#173D3A] hover:text-primary border-[#D2E7DF] bg-white/80 hover:border-[#258663] shadow-2xs"
                }`}
              >
                <span>Jump to Launch</span>
                <ArrowDown className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
