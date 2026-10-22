"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface SynapseNucleusProps {
  isHovered?: boolean;
  activeModuleId?: string | null;
  onHoverNucleus?: (hovered: boolean) => void;
  className?: string;
}

export function SynapseNucleus({
  isHovered = false,
  activeModuleId = null,
  onHoverNucleus,
  className = "",
}: SynapseNucleusProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalHover, setInternalHover] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Parallax and rotation state in refs for 60fps performance without re-renders
  const stateRef = useRef({
    angleX: 0.2,
    angleY: 0,
    angleZ: 0.1,
    targetMouseX: 0,
    targetMouseY: 0,
    currentMouseX: 0,
    currentMouseY: 0,
    time: 0,
    animFrameId: 0,
  });

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Pointer parallax handler
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    stateRef.current.targetMouseX = x * 0.45;
    stateRef.current.targetMouseY = y * 0.45;
  }, []);

  const handlePointerLeave = useCallback(() => {
    stateRef.current.targetMouseX = 0;
    stateRef.current.targetMouseY = 0;
    setInternalHover(false);
    onHoverNucleus?.(false);
  }, [onHoverNucleus]);

  const handlePointerEnter = useCallback(() => {
    setInternalHover(true);
    onHoverNucleus?.(true);
  }, [onHoverNucleus]);

  // Main Canvas 3D rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Generate Fibonacci sphere points
    const POINT_COUNT = 64;
    const sphereRadius = 110;
    const points: Point3D[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < POINT_COUNT; i++) {
      const y = 1 - (i / (POINT_COUNT - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      points.push({
        x: x * sphereRadius,
        y: y * sphereRadius,
        z: z * sphereRadius,
      });
    }

    // 3D rotation matrix helper
    const rotateX = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
    };

    const rotateY = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
    };

    const rotateZ = (p: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
    };

    const cameraDistance = 380;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const state = stateRef.current;

      // Handle canvas resolution
      const width = canvas.clientWidth || 360;
      const height = canvas.clientHeight || 360;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Lerp mouse parallax
      state.currentMouseX += (state.targetMouseX - state.currentMouseX) * 0.08;
      state.currentMouseY += (state.targetMouseY - state.currentMouseY) * 0.08;

      // Increment rotation unless reduced motion
      const effectiveHover = isHovered || internalHover || Boolean(activeModuleId);
      const rotSpeed = reducedMotion ? 0 : effectiveHover ? 0.007 : 0.0045;

      state.angleY += rotSpeed;
      state.angleX = 0.22 + state.currentMouseY;
      state.angleZ = 0.08 + state.currentMouseX;
      state.time += 0.02;

      // 1. Central Volumetric Teal Core Glow
      const pulse = 1 + Math.sin(state.time * 2) * 0.08;
      const coreRadius = (effectiveHover ? 58 : 50) * pulse;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2);
      coreGrad.addColorStop(0, "rgba(6, 133, 142, 0.45)");
      coreGrad.addColorStop(0.35, "rgba(10, 74, 85, 0.25)");
      coreGrad.addColorStop(0.7, "rgba(6, 133, 142, 0.08)");
      coreGrad.addColorStop(1, "rgba(6, 133, 142, 0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Projected 3D Points
      interface ProjectedPoint {
        px: number;
        py: number;
        pz: number;
        scale: number;
        alpha: number;
      }

      const projected: ProjectedPoint[] = [];

      for (let i = 0; i < points.length; i++) {
        let p = rotateY(points[i], state.angleY);
        p = rotateX(p, state.angleX);
        p = rotateZ(p, state.angleZ);

        const scale = cameraDistance / (cameraDistance + p.z);
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        // Depth-based alpha
        const alpha = Math.max(0.12, Math.min(0.95, (p.z + sphereRadius) / (sphereRadius * 2)));

        projected.push({ px, py, pz: p.z, scale, alpha });
      }

      // 3. Neural Filaments (connecting neighboring points)
      const maxDist = 48;
      ctx.lineWidth = effectiveHover ? 1.2 : 0.85;

      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * Math.min(projected[i].alpha, projected[j].alpha) * (effectiveHover ? 0.65 : 0.42);
            ctx.strokeStyle = `rgba(30, 158, 166, ${lineAlpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.stroke();
          }
        }
      }

      // 4. Render Sphere Points (depth sorted)
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        const pointRadius = (pt.scale * 2.2).toFixed(2);
        ctx.fillStyle = `rgba(6, 133, 142, ${pt.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, Math.max(0.8, parseFloat(pointRadius)), 0, Math.PI * 2);
        ctx.fill();

        // Extra glowing highlight on front-facing particles
        if (pt.pz > 40) {
          ctx.fillStyle = `rgba(201, 229, 231, ${(pt.alpha * 0.8).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Render 3 Concentric Tilted Orbital Rings in 3D
      const rings = [
        { radius: 135, tiltX: 1.1, tiltZ: 0.35, rotSpeed: 0.008, color: "rgba(6, 133, 142, 0.45)" },
        { radius: 160, tiltX: -0.85, tiltZ: -0.4, rotSpeed: -0.006, color: "rgba(30, 158, 166, 0.35)" },
        { radius: 185, tiltX: 0.4, tiltZ: 0.65, rotSpeed: 0.005, color: "rgba(10, 74, 85, 0.28)" },
      ];

      rings.forEach((ring, rIdx) => {
        const ringSegments = 48;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = effectiveHover ? 1.4 : 1.0;
        ctx.beginPath();

        let firstPt: { x: number; y: number } | null = null;
        for (let s = 0; s <= ringSegments; s++) {
          const theta = (s / ringSegments) * Math.PI * 2;
          let pt: Point3D = {
            x: Math.cos(theta) * ring.radius,
            y: 0,
            z: Math.sin(theta) * ring.radius,
          };

          // Apply ring inclination tilt
          pt = rotateX(pt, ring.tiltX);
          pt = rotateZ(pt, ring.tiltZ);
          // Apply dynamic scene rotation
          pt = rotateY(pt, state.angleY * 0.8);
          pt = rotateX(pt, state.currentMouseY * 0.5);

          const scale = cameraDistance / (cameraDistance + pt.z);
          const px = cx + pt.x * scale;
          const py = cy + pt.y * scale;

          if (s === 0) {
            ctx.moveTo(px, py);
            firstPt = { x: px, y: py };
          } else {
            ctx.lineTo(px, py);
          }
        }
        if (firstPt) ctx.lineTo(firstPt.x, firstPt.y);
        ctx.stroke();

        // Satellite energy dot orbiting on this ring
        if (!reducedMotion) {
          const satAngle = (state.time * (1.2 + rIdx * 0.4) * (rIdx % 2 === 0 ? 1 : -1)) % (Math.PI * 2);
          let satPt: Point3D = {
            x: Math.cos(satAngle) * ring.radius,
            y: 0,
            z: Math.sin(satAngle) * ring.radius,
          };
          satPt = rotateX(satPt, ring.tiltX);
          satPt = rotateZ(satPt, ring.tiltZ);
          satPt = rotateY(satPt, state.angleY * 0.8);
          satPt = rotateX(satPt, state.currentMouseY * 0.5);

          const satScale = cameraDistance / (cameraDistance + satPt.z);
          const spx = cx + satPt.x * satScale;
          const spy = cy + satPt.y * satScale;

          // Glowing satellite
          ctx.fillStyle = "#1E9EA6";
          ctx.beginPath();
          ctx.arc(spx, spy, 3 * satScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(spx, spy, 1.2 * satScale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();

      state.animFrameId = requestAnimationFrame(render);
    };

    stateRef.current.animFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(stateRef.current.animFrameId);
    };
  }, [isHovered, internalHover, activeModuleId, reducedMotion]);

  const isHighlighted = isHovered || internalHover || Boolean(activeModuleId);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
      className={`relative flex items-center justify-center select-none cursor-pointer group ${className}`}
      aria-label="Synapse AI Brain Core Nucleus"
      title="Synapse AI Brain — Central Intelligence Nucleus"
    >
      {/* Ambient background glow */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
          isHighlighted
            ? "opacity-60 bg-gradient-to-tr from-[#06858E]/40 via-[#1E9EA6]/30 to-[#0A4A55]/40"
            : "opacity-35 bg-gradient-to-tr from-[#06858E]/25 via-[#C9E5E7]/20 to-[#0A4A55]/25"
        }`}
        aria-hidden="true"
      />

      {/* 3D Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] lg:w-[420px] lg:h-[420px] pointer-events-none z-10"
        aria-hidden="true"
      />

      {/* CENTER GLASS EMBLEM: SYNAPSE AI CORE */}
      <div
        className={`absolute z-20 flex flex-col items-center justify-center transition-all duration-300 pointer-events-auto ${
          isHighlighted ? "scale-108" : "scale-100"
        }`}
        style={{
          transform: `perspective(600px) rotateX(${stateRef.current.targetMouseY * 12}deg) rotateY(${
            stateRef.current.targetMouseX * 12
          }deg)`,
        }}
      >
        {/* Central Squircle Capsule */}
        <div
          className="relative size-18 sm:size-20 rounded-2xl flex flex-col items-center justify-center p-2.5 text-white shadow-2xl transition-all duration-300 border border-[#C9E5E7]/50"
          style={{
            background: "linear-gradient(135deg, #0A4A55 0%, #06858E 100%)",
            boxShadow: isHighlighted
              ? "0 0 35px rgba(6, 133, 142, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.4)"
              : "0 10px 25px rgba(6, 133, 142, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.3)",
          }}
        >
          {/* Inner animated pulse ring */}
          <div className="absolute inset-1 rounded-xl border border-white/20 pointer-events-none" />

          {/* Glowing Synapse Core Glyph */}
          <Sparkles className="size-6 sm:size-7 text-[#C9E5E7] mb-0.5 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase text-white">
            SYNAPSE
          </span>
          <span className="text-[8px] font-sans font-medium text-[#C9E5E7]/90 tracking-tighter uppercase">
            AI NUCLEUS
          </span>
        </div>

        {/* Subtitle tag beneath the nucleus */}
        <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-card/85 dark:bg-card/70 border border-border/70 backdrop-blur-md shadow-xs flex items-center gap-1.5 transition-all">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-medium text-foreground tracking-tight">
            Synapse AI Brain
          </span>
        </div>
      </div>
    </div>
  );
}
