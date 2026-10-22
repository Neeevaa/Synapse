"use client";

import React, { useId } from "react";
import { SynapseModuleConfig } from "./synapse-modules";

interface NeuralConnectionsProps {
  modules: SynapseModuleConfig[];
  activeModuleId: string | null;
  isNucleusHovered: boolean;
  className?: string;
}

export function NeuralConnections({
  modules,
  activeModuleId,
  isNucleusHovered,
  className = "",
}: NeuralConnectionsProps) {
  const baseId = useId();
  const gradId = `neural-grad-${baseId.replace(/:/g, "")}`;

  // Normalized 800 x 600 coordinate system
  const cx = 400;
  const cy = 300;
  const nucleusRadius = 75;

  // Calculate curve paths from nucleus port to module node
  const pathData = modules.map((mod) => {
    // Port on circumference of nucleus
    const rad = (mod.nucleusPortAngle * Math.PI) / 180;
    const startX = cx + Math.cos(rad) * nucleusRadius;
    const startY = cy + Math.sin(rad) * nucleusRadius;
    const endX = mod.desktopPos.x;
    const endY = mod.desktopPos.y;

    // Control point biased towards center for organic neural curvature
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    // Organic offset perpendicular to chord
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / (dist || 1);
    const perpY = dx / (dist || 1);
    const curvature = Math.min(dist * 0.16, 38) * (mod.desktopPos.y < cy ? 1 : -1);

    const cpx = midX + perpX * curvature;
    const cpy = midY + perpY * curvature;

    const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;

    return {
      id: mod.id,
      startX,
      startY,
      endX,
      endY,
      pathD,
      isActive: activeModuleId === mod.id,
    };
  });

  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="none"
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Glow filter */}
        <filter id={`${gradId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Dynamic teal pulse gradient */}
        <linearGradient id={`${gradId}-active`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06858E" stopOpacity="1" />
          <stop offset="50%" stopColor="#1E9EA6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#C9E5E7" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id={`${gradId}-ambient`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06858E" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0A4A55" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* 1. Base Pathway Lines */}
      {pathData.map(({ id, pathD, isActive }) => {
        const isDimmed = activeModuleId && !isActive;

        return (
          <g key={`base-${id}`}>
            {/* Low-contrast background guide */}
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeOpacity={isDimmed ? 0.05 : 0.16}
              strokeWidth="1.2"
              className="transition-opacity duration-300"
            />

            {/* Ambient subtle connection pulse */}
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId}-ambient)`}
              strokeWidth={isActive ? "2.6" : isNucleusHovered ? "1.8" : "1.2"}
              strokeOpacity={isActive ? 1 : isNucleusHovered ? 0.7 : 0.35}
              strokeDasharray={isActive ? "none" : "4 8"}
              className="transition-all duration-300"
              filter={isActive ? `url(#${gradId}-glow)` : undefined}
            />

            {/* Active Highlight Line when selected/hovered */}
            {isActive && (
              <path
                d={pathD}
                fill="none"
                stroke={`url(#${gradId}-active)`}
                strokeWidth="2.8"
                filter={`url(#${gradId}-glow)`}
                className="animate-in fade-in duration-200"
              />
            )}
          </g>
        );
      })}

      {/* 2. Animated Energy Particles along paths */}
      {pathData.map(({ id, pathD, isActive }, idx) => {
        const isDimmed = activeModuleId && !isActive;
        const dur = isActive ? "1.8s" : isNucleusHovered ? "2.4s" : `${3.2 + (idx % 3) * 0.8}s`;

        return (
          <g key={`particle-${id}`} opacity={isDimmed ? 0.2 : 1} className="transition-opacity duration-300">
            {/* Traveling energy dot 1 */}
            <circle r={isActive ? 3.5 : 2.4} fill={isActive ? "#FFFFFF" : "#06858E"} filter={isActive ? `url(#${gradId}-glow)` : undefined}>
              <animateMotion
                dur={dur}
                repeatCount="indefinite"
                path={pathD}
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              />
            </circle>

            {/* Traveling energy dot 2 (staggered) */}
            <circle
              r={isActive ? 2.4 : 1.6}
              fill={isActive ? "#C9E5E7" : "#1E9EA6"}
              opacity={isActive ? 0.95 : 0.65}
            >
              <animateMotion
                dur={dur}
                begin={`-${(parseFloat(dur) * 0.5).toFixed(1)}s`}
                repeatCount="indefinite"
                path={pathD}
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              />
            </circle>
          </g>
        );
      })}

      {/* 3. Terminal connection dots at nucleus and node endpoints */}
      {pathData.map(({ id, startX, startY, endX, endY, isActive }) => (
        <g key={`terminals-${id}`}>
          {/* Nucleus port anchor */}
          <circle
            cx={startX}
            cy={startY}
            r={isActive ? 3.5 : 2}
            fill={isActive ? "#06858E" : "#1E9EA6"}
            opacity={isActive ? 1 : 0.6}
          />
          {/* Module node port anchor */}
          <circle
            cx={endX}
            cy={endY}
            r={isActive ? 4 : 2.5}
            fill={isActive ? "#06858E" : "#0A4A55"}
            opacity={isActive ? 1 : 0.5}
          />
        </g>
      ))}
    </svg>
  );
}
