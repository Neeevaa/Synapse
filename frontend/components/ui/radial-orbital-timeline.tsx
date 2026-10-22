"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useId,
} from "react";
import Link from "next/link";
import {
  FileCheck2,
  TestTube2,
  MessageSquareCode,
  Database,
  GitBranch,
  Kanban,
  AlertTriangle,
  FileText,
  Workflow,
  TrendingUp,
  Sparkles,
  Bot,
  Play,
  Pause,
  RotateCcw,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SYNAPSE_FEATURES,
  type SynapseFeature,
  type ImplementationStatus,
} from "@/data/synapse-features";

// Icon resolver helper
function FeatureIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  switch (name) {
    case "FileCheck2":
      return <FileCheck2 className={className} />;
    case "TestTube2":
      return <TestTube2 className={className} />;
    case "MessageSquareCode":
      return <MessageSquareCode className={className} />;
    case "Database":
      return <Database className={className} />;
    case "GitBranch":
      return <GitBranch className={className} />;
    case "Kanban":
      return <Kanban className={className} />;
    case "AlertTriangle":
      return <AlertTriangle className={className} />;
    case "FileText":
      return <FileText className={className} />;
    case "Workflow":
      return <Workflow className={className} />;
    case "TrendingUp":
      return <TrendingUp className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function RadialOrbitalTimeline({
  className,
  initialFeatureId,
}: {
  className?: string;
  initialFeatureId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFeatureId || null
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [reducedMotion, setReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const orbitalStageRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isPointerInteractingRef = useRef(false);

  // Gradient ID prefix to ensure unique SVG IDs
  const gradId = useId();

  // Detect user's reduced-motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches) {
      setIsPlaying(false);
    }
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setIsPlaying(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Keyboard navigation: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) {
        setSelectedId(null);
        setIsPlaying(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  // Selected feature lookup
  const selectedFeature = useMemo(
    () => SYNAPSE_FEATURES.find((f) => f.id === selectedId) || null,
    [selectedId]
  );

  // Connected feature IDs set for quick membership checking
  const connectedIdsSet = useMemo(() => {
    if (!selectedFeature) return new Set<string>();
    return new Set(selectedFeature.connectedFeatureIds);
  }, [selectedFeature]);

  // Filtered features for category bar
  const categories = useMemo(() => {
    return [
      "All",
      "AI Core",
      "Agile Lifecycle",
      "Knowledge & Intelligence",
      "Predictive Analytics",
    ] as const;
  }, []);

  // Smooth orbital continuous rotation loop
  useEffect(() => {
    // If reduced motion or paused or a node is selected or user is dragging/hovering
    const shouldRotate =
      isPlaying &&
      !selectedId &&
      !reducedMotion &&
      !isPointerInteractingRef.current;

    if (!shouldRotate) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const speed = 0.032; // degrees per ms -> ~360 deg in ~11 seconds if 0.032; let's tune for gentle rotation (~45s per cycle)
    const degPerMs = 360 / (48 * 1000); // 360 degrees in 48 seconds = 0.0075 deg/ms

    const step = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = time - lastTimeRef.current;
        // Cap delta to prevent huge jumps on tab switch
        const cappedDelta = Math.min(delta, 100);
        setRotationAngle((prev) => (prev + cappedDelta * degPerMs) % 360);
      }
      lastTimeRef.current = time;
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, selectedId, reducedMotion]);

  // Node selection handler
  const handleSelectNode = useCallback((id: string) => {
    setSelectedId((prev) => {
      const next = prev === id ? null : id;
      setIsPlaying(next === null);
      return next;
    });
  }, []);

  // Deselect handler
  const handleDeselect = useCallback(() => {
    setSelectedId(null);
    setIsPlaying(true);
  }, []);

  // Background click handler on the SVG canvas
  const handleStageBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicked directly on the stage container or SVG canvas
      if (
        e.target === e.currentTarget ||
        (e.target as HTMLElement).tagName === "svg" ||
        (e.target as HTMLElement).tagName === "rect"
      ) {
        if (selectedId) {
          handleDeselect();
        }
      }
    },
    [selectedId, handleDeselect]
  );

  // Orbital geometry calculations (Responsive 500x500 virtual coordinate space)
  const viewBoxSize = 540;
  const centerCoord = viewBoxSize / 2; // 270
  const orbitRadius = 195; // Radius of main orbital circle

  // Compute node positions based on rotationAngle
  const nodePositions = useMemo(() => {
    const total = SYNAPSE_FEATURES.length;
    return SYNAPSE_FEATURES.map((feature, index) => {
      // Base angle in degrees for even spacing
      const baseAngle = (index * 360) / total;
      const currentAngleDeg = (baseAngle + rotationAngle) % 360;
      const angleRad = (currentAngleDeg * Math.PI) / 180;

      // X and Y in virtual coordinate space
      const x = centerCoord + orbitRadius * Math.cos(angleRad);
      const y = centerCoord + orbitRadius * Math.sin(angleRad);

      return {
        feature,
        index,
        currentAngleDeg,
        x,
        y,
      };
    });
  }, [rotationAngle, centerCoord, orbitRadius]);

  // Find active node coordinates for drawing SVG connection lines
  const activeNodePos = useMemo(() => {
    if (!selectedId) return null;
    return nodePositions.find((np) => np.feature.id === selectedId) || null;
  }, [selectedId, nodePositions]);

  // Find connected node coordinates for drawing connection arcs/lines
  const connectedNodesPos = useMemo(() => {
    if (!selectedFeature) return [];
    return nodePositions.filter((np) =>
      selectedFeature.connectedFeatureIds.includes(np.feature.id)
    );
  }, [selectedFeature, nodePositions]);

  return (
    <section
      id="ecosystem"
      ref={containerRef}
      className={cn(
        "relative py-16 sm:py-24 px-4 sm:px-6 lg:px-10 overflow-hidden",
        className
      )}
      aria-label="A workspace that connects every layer"
    >
      {/* Anchor for #preview navigation links */}
      <div id="preview" className="absolute -top-24" />

      {/* Background ambient lighting gradients */}
      <div
        className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none opacity-20 dark:opacity-15 blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, var(--primary, #0a4a55) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-1/4 w-[420px] h-[420px] rounded-full pointer-events-none opacity-25 dark:opacity-10 blur-[80px]"
        style={{
          background:
            "radial-gradient(circle, var(--synapse-accent, #E5D3AF) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-[1400px] mx-auto">
        {/* SECTION HEADER */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-[1.15] mb-4">
            A workspace that connects every layer.
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore how Synapse unifies requirements, sprint planning, and contextual intelligence in one coherent interface.
          </p>

          {/* Quick Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6 sm:mt-7">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/70"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN INTERACTIVE STAGE: 2-COLUMN LAYOUT ON DESKTOP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* COLUMN 1: ORBITAL VISUALIZATION (lg:col-span-6 or 7) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div
              ref={orbitalStageRef}
              onClick={handleStageBackgroundClick}
              onPointerEnter={() => {
                isPointerInteractingRef.current = true;
              }}
              onPointerLeave={() => {
                isPointerInteractingRef.current = false;
              }}
              className="relative w-full max-w-[540px] aspect-square rounded-3xl border border-border/80 bg-card/60 dark:bg-card/40 backdrop-blur-md shadow-xl p-2 sm:p-4 flex items-center justify-center overflow-hidden select-none"
            >
              {/* SVG LAYER: RINGS, CONNECTIONS, AND GLOW */}
              <svg
                viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                <defs>
                  {/* Teal to Beige Gradient */}
                  <linearGradient
                    id={`${gradId}-orbit-accent`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#0a4a55" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#E5D3AF" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#AEC4D4" stopOpacity="0.8" />
                  </linearGradient>

                  {/* Pulsing connection line gradient */}
                  <linearGradient
                    id={`${gradId}-active-conn`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#0a4a55" stopOpacity="1" />
                    <stop offset="100%" stopColor="#E5D3AF" stopOpacity="0.9" />
                  </linearGradient>

                  <filter
                    id={`${gradId}-glow`}
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Subtle Inner Orbit Ring */}
                <circle
                  cx={centerCoord}
                  cy={centerCoord}
                  r={orbitRadius * 0.58}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="1.2"
                  strokeDasharray="4 6"
                />

                {/* Main Orbital Track */}
                <circle
                  cx={centerCoord}
                  cy={centerCoord}
                  r={orbitRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.16"
                  strokeWidth="1.5"
                />

                {/* Orbital Track Accent Segment */}
                <circle
                  cx={centerCoord}
                  cy={centerCoord}
                  r={orbitRadius}
                  fill="none"
                  stroke={`url(#${gradId}-orbit-accent)`}
                  strokeWidth="2"
                  strokeDasharray="40 180"
                  strokeLinecap="round"
                  className="opacity-70 dark:opacity-50"
                  style={{
                    transformOrigin: `${centerCoord}px ${centerCoord}px`,
                    transform: `rotate(${rotationAngle}deg)`,
                  }}
                />

                {/* Outer Constellation Ring */}
                <circle
                  cx={centerCoord}
                  cy={centerCoord}
                  r={orbitRadius * 1.25}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.06"
                  strokeWidth="1"
                  strokeDasharray="2 10"
                />

                {/* Dynamic Connection Lines: Center -> Selected Node */}
                {activeNodePos && (
                  <line
                    x1={centerCoord}
                    y1={centerCoord}
                    x2={activeNodePos.x}
                    y2={activeNodePos.y}
                    stroke={`url(#${gradId}-active-conn)`}
                    strokeWidth="2.4"
                    strokeDasharray="6 4"
                    filter={`url(#${gradId}-glow)`}
                    className="transition-all duration-300"
                  />
                )}

                {/* Dynamic Connection Lines: Selected Node -> Connected Nodes */}
                {activeNodePos &&
                  connectedNodesPos.map((conn) => (
                    <g key={conn.feature.id}>
                      {/* Curving Quadratic Bezier towards center */}
                      <path
                        d={`M ${activeNodePos.x} ${activeNodePos.y} Q ${centerCoord} ${centerCoord} ${conn.x} ${conn.y}`}
                        fill="none"
                        stroke="#E5D3AF"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                        strokeOpacity="0.85"
                        filter={`url(#${gradId}-glow)`}
                        className="transition-all duration-300"
                      />
                      {/* Glowing dot on connected node */}
                      <circle
                        cx={conn.x}
                        cy={conn.y}
                        r="3.5"
                        fill="#E5D3AF"
                        className="animate-ping"
                      />
                    </g>
                  ))}
              </svg>

              {/* CENTER NODE: SYNAPSE AI */}
              <div
                className="absolute z-10 flex flex-col items-center justify-center pointer-events-auto cursor-pointer group"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                onClick={handleDeselect}
                title="Synapse AI Core — Click to reset view"
                tabIndex={0}
                role="button"
                aria-label="Synapse AI Core Platform"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleDeselect();
                  }
                }}
              >
                {/* Pulsing ambient halo */}
                <div className="absolute inset-0 -m-3 rounded-full bg-primary/20 blur-md animate-pulse pointer-events-none" />

                {/* Central squircle button */}
                <div className="relative size-18 sm:size-20 rounded-2xl bg-gradient-to-br from-[#0a4a55] to-[#06858e] text-white flex flex-col items-center justify-center p-2 shadow-xl shadow-primary/30 border border-[#E5D3AF]/40 transition-transform duration-300 group-hover:scale-105 active:scale-95">
                  <Bot className="size-6 sm:size-7 text-[#E5D3AF] mb-0.5" />
                  <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-white uppercase font-mono">
                    Synapse AI
                  </span>
                  <span className="text-[8px] text-[#E5D3AF]/85 tracking-tighter hidden sm:block">
                    Core Platform
                  </span>
                </div>
              </div>

              {/* 10 ORBITAL NODES */}
              {nodePositions.map(({ feature, x, y }) => {
                const isSelected = selectedId === feature.id;
                const isConnected = connectedIdsSet.has(feature.id);
                const isHovered = hoveredId === feature.id;
                const isCategoryMatch =
                  activeCategory === "All" ||
                  feature.category === activeCategory;

                // Scale relative to 540 viewBox with fixed precision for consistent SSR/CSR hydration
                const leftPercent = `${((x / viewBoxSize) * 100).toFixed(4)}%`;
                const topPercent = `${((y / viewBoxSize) * 100).toFixed(4)}%`;

                return (
                  <div
                    key={feature.id}
                    className="absolute z-20 pointer-events-auto"
                    style={{
                      left: leftPercent,
                      top: topPercent,
                      transform: "translate(-50%, -50%)",
                      transition:
                        "transform 0.15s ease-out, opacity 0.2s ease-out",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectNode(feature.id)}
                      onMouseEnter={() => setHoveredId(feature.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => {
                        setHoveredId(feature.id);
                        setIsPlaying(false);
                      }}
                      onBlur={() => setHoveredId(null)}
                      aria-label={`${feature.name} (${feature.statusLabel})`}
                      aria-pressed={isSelected}
                      className={cn(
                        "relative group flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        // Size & shape
                        "size-11 sm:size-12 md:size-13",
                        // Base background & border
                        "border backdrop-blur-md shadow-md",
                        // Selected state
                        isSelected && [
                          "bg-primary text-primary-foreground border-primary ring-4 ring-primary/30 scale-115 shadow-xl shadow-primary/30 z-30",
                        ],
                        // Connected state (when another feature is selected)
                        !isSelected &&
                          isConnected && [
                            "bg-card text-foreground border-[#E5D3AF] ring-3 ring-[#E5D3AF]/60 scale-108 shadow-lg shadow-[#E5D3AF]/20 z-20",
                          ],
                        // Standard state
                        !isSelected &&
                          !isConnected && [
                            "bg-card/90 hover:bg-card text-foreground border-border/80 hover:border-primary/50 hover:scale-108",
                            !isCategoryMatch && "opacity-35 hover:opacity-100",
                          ]
                      )}
                    >
                      {/* Node Icon */}
                      <FeatureIcon
                        name={feature.iconName}
                        className={cn(
                          "size-5 sm:size-5.5 transition-transform group-hover:scale-110",
                          isSelected
                            ? "text-white"
                            : isConnected
                            ? "text-primary"
                            : "text-foreground/80 group-hover:text-primary"
                        )}
                      />

                      {/* Status indicator dot */}
                      <span
                        className={cn(
                          "absolute -top-1 -right-1 size-3 rounded-full border-2 border-card",
                          feature.status === "implemented"
                            ? "bg-emerald-500"
                            : feature.status === "partially_implemented"
                            ? "bg-amber-500"
                            : "bg-blue-400"
                        )}
                        title={`Status: ${feature.statusLabel}`}
                      />

                      {/* Connected badge indicator */}
                      {isConnected && !isSelected && (
                        <span className="absolute -bottom-1 -left-1 px-1 rounded-sm bg-[#E5D3AF] text-[#4A3539] text-[9px] font-bold tracking-tighter uppercase">
                          link
                        </span>
                      )}

                      {/* Tooltip on hover (when not selected) */}
                      {isHovered && !isSelected && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150"
                          role="tooltip"
                        >
                          {feature.shortName}
                          <span className="ml-1 text-[10px] opacity-75">
                            • {feature.statusLabel}
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* CONTROLS BAR UNDER ORBIT */}
            <div className="w-full max-w-[540px] mt-4 flex items-center justify-between px-2 text-xs text-muted-foreground">
              {/* Play / Pause Rotation Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="gap-1.5 h-7 px-2.5 text-xs font-mono"
                  aria-label={
                    isPlaying
                      ? "Pause orbital auto-rotation"
                      : "Resume orbital auto-rotation"
                  }
                >
                  {isPlaying ? (
                    <>
                      <Pause className="size-3" />
                      <span>Pause Orbit</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3" />
                      <span>Play Orbit</span>
                    </>
                  )}
                </Button>

                {selectedId && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleDeselect}
                    className="gap-1 h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset View</span>
                  </Button>
                )}
              </div>

              {/* Status Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>Implemented</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>Partial</span>
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: DETAILED FEATURE INSPECTION PANEL (lg:col-span-5) */}
          <div className="lg:col-span-5 w-full">
            {selectedFeature ? (
              /* SELECTED FEATURE DETAIL CARD */
              <div
                className="relative rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-7 md:p-8 transition-all duration-300 animate-in fade-in slide-in-from-right-4"
                role="region"
                aria-live="polite"
              >
                {/* Header row: Category, Status Badge & Close button */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/70">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20">
                      {selectedFeature.category}
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        selectedFeature.status === "implemented"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      )}
                    >
                      {selectedFeature.status === "implemented" ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      <span>{selectedFeature.statusLabel}</span>
                    </span>
                  </div>

                  <button
                    onClick={handleDeselect}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Close feature details and resume orbit"
                    title="Close and resume orbit (Esc)"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Feature Title & Summary */}
                <div className="mt-5 mb-5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <FeatureIcon
                        name={selectedFeature.iconName}
                        className="size-6"
                      />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                      {selectedFeature.name}
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {selectedFeature.oneLiner}
                  </p>
                </div>

                {/* SECTION: The Problem */}
                <div className="mb-5 p-4 rounded-2xl bg-muted/40 border border-border/80">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    <span>The Problem</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {selectedFeature.problem}
                  </p>
                </div>

                {/* SECTION: How Synapse Helps */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary mb-2.5">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>How Synapse Works</span>
                  </div>
                  <ul className="space-y-2">
                    {selectedFeature.howSynapseHelps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                      >
                        <span className="flex-shrink-0 size-5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-semibold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* SECTION: Practical Benefit */}
                <div className="mb-5 p-3.5 rounded-xl bg-[#E5D3AF]/20 dark:bg-[#E5D3AF]/10 border border-[#E5D3AF]/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6e565a] dark:text-[#E5D3AF] mb-1">
                    <ShieldCheck className="size-4 text-primary" />
                    <span>Practical Value</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90">
                    {selectedFeature.practicalBenefit}
                  </p>
                </div>

                {/* SECTION: Connected Capabilities (Interactive Chips) */}
                <div className="mb-6 pt-4 border-t border-border/70">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Connected Capabilities
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Click to inspect
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFeature.connectedFeatureIds.map((connId) => {
                      const connFeat = SYNAPSE_FEATURES.find(
                        (f) => f.id === connId
                      );
                      if (!connFeat) return null;
                      return (
                        <button
                          key={connId}
                          type="button"
                          onClick={() => handleSelectNode(connId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/80 hover:bg-[#E5D3AF]/30 dark:hover:bg-[#E5D3AF]/20 text-foreground border border-border/80 hover:border-[#E5D3AF] transition-all cursor-pointer"
                        >
                          <FeatureIcon
                            name={connFeat.iconName}
                            className="size-3.5 text-primary"
                          />
                          <span>{connFeat.shortName}</span>
                          <ChevronRight className="size-3 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Call to action & verification reference */}
                <div className="space-y-3">
                  <Link
                    href={selectedFeature.ctaHref}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-95 transition-opacity shadow-sm"
                  >
                    <span>{selectedFeature.ctaText}</span>
                    <ArrowRight className="size-4" />
                  </Link>

                  <p className="text-[11px] text-muted-foreground font-mono leading-tight text-center">
                    Source Verified: {selectedFeature.statusEvidence}
                  </p>
                </div>
              </div>
            ) : (
              /* WELCOME / ECOSYSTEM OVERVIEW CARD WHEN NO FEATURE IS SELECTED */
              <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-md shadow-xl p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono mb-4">
                  <Layers className="size-3.5" />
                  <span>Ecosystem Overview</span>
                </div>

                <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
                  Click any node to inspect the system
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Unlike disjointed AI point solutions, Synapse unifies
                  requirements, meeting intelligence, test cases, and sprint
                  boards into an interconnected lifecycle. Click an orbital node
                  above to see how each capability works, its verified
                  implementation, and how it links to other modules.
                </p>

                {/* 3 Core Architecture Pillars */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        Vector-Grounded RAG Context
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Every audit, suggestion, and answer cites real project
                        artifacts with strict company and project isolation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        Human-in-the-Loop Governance
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        AI never silently writes code or mutates tasks. All
                        suggestions require engineer or PM confirmation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                    <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        Bi-Directional Lifecycle Traceability
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        From spoken meeting discussions to requirements, tasks,
                        and QA test cases with zero manual spreadsheet syncing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick 10-Feature Selector Grid */}
                <div className="pt-4 border-t border-border/70">
                  <p className="text-xs font-mono uppercase text-muted-foreground mb-3">
                    Select a feature to begin:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SYNAPSE_FEATURES.map((feat) => (
                      <button
                        key={feat.id}
                        onClick={() => handleSelectNode(feat.id)}
                        className="flex items-center gap-2 p-2 rounded-lg text-left text-xs bg-muted/50 hover:bg-muted border border-border/60 hover:border-primary/50 text-foreground transition-all cursor-pointer"
                      >
                        <FeatureIcon
                          name={feat.iconName}
                          className="size-3.5 text-primary shrink-0"
                        />
                        <span className="truncate font-medium">
                          {feat.shortName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
