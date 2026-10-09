"use client";

import React, { useState } from "react";
import Image from "next/image";
import { WEBSITE_IMAGES, type WebsiteImageKey } from "./constants";
import { Sparkles, Layers, CheckCircle2, ArrowUpRight } from "lucide-react";

interface WebsiteImageProps {
  imageKey: WebsiteImageKey;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: "video" | "wide" | "square" | "portrait" | "auto";
  variant?: "dark" | "light";
  priority?: boolean;
  mockupTitle?: string;
  mockupSubtitle?: string;
  previewType?: "hero" | "board" | "requirements" | "meeting" | "ai" | "search" | "dashboard" | "generic";
}

export function WebsiteImage({
  imageKey,
  alt,
  className = "",
  containerClassName = "",
  aspectRatio = "wide",
  variant = "dark",
  priority = false,
  mockupTitle,
  mockupSubtitle,
  previewType = "generic",
}: WebsiteImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const src = WEBSITE_IMAGES[imageKey];

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video"
      : aspectRatio === "wide"
      ? "aspect-[16/10]"
      : aspectRatio === "portrait"
      ? "aspect-[3/4]"
      : aspectRatio === "square"
      ? "aspect-square"
      : "aspect-auto";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        variant === "dark"
          ? "border-[#234641] bg-[#103A38] text-[#E8F1EE] shadow-2xl shadow-black/40"
          : "border-[#D2DCB6] bg-[#FFFFFF] text-[#263329] shadow-xl shadow-slate-900/5"
      } ${aspectClass} ${containerClassName}`}
    >
      {/* Real Image Render Attempt */}
      {!imageError && (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 1200px"
          className={`object-cover transition-all duration-700 ${
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          } ${className}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {/* Editorial High-End Fallback Mockup using Image 1 & Image 2 palettes */}
      {(!imageLoaded || imageError) && (
        <div
          className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-8 select-none transition-opacity duration-300 ${
            variant === "dark"
              ? "bg-gradient-to-br from-[#103A38] via-[#092328] to-[#071b1f]"
              : "bg-gradient-to-br from-[#FFFFFF] via-[#F1F3E0] to-[#E5EAD2]"
          }`}
        >
          {/* Subtle Ambient Background Mesh */}
          <div
            className={`pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-3xl opacity-30 ${
              variant === "dark" ? "bg-[#12544F]" : "bg-[#A1BC98]/40"
            }`}
          />
          <div
            className={`pointer-events-none absolute -left-20 -bottom-20 size-64 rounded-full blur-3xl opacity-20 ${
              variant === "dark" ? "bg-[#2A835F]" : "bg-[#778873]/25"
            }`}
          />

          {/* Top Bar of Product Mockup */}
          <div className="relative z-10 flex items-center justify-between border-b pb-4 border-current/10">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className={`size-2.5 rounded-full ${variant === "dark" ? "bg-[#8BBB92]" : "bg-[#778873]"}`} />
              <span className="ml-2 font-mono text-xs opacity-60 tracking-wider">
                SYNAPSE / {previewType.toUpperCase()}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                variant === "dark"
                  ? "border-[#234641] bg-[#12544F]/50 text-[#8BBB92]"
                  : "border-[#D2DCB6] bg-[#D2DCB6]/40 text-[#586554]"
              }`}
            >
              <span
                className={`size-1.5 rounded-full animate-pulse ${
                  variant === "dark" ? "bg-[#8BBB92]" : "bg-[#778873]"
                }`}
              />
              Synapse Product Preview
            </div>
          </div>

          {/* Center Contextual Mockup Elements */}
          <div className="relative z-10 my-auto py-4">
            {previewType === "hero" || previewType === "dashboard" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-current/15" />
                    <div className="h-2.5 w-48 rounded bg-current/10" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-7 w-20 rounded-md border ${
                        variant === "dark"
                          ? "bg-[#12544F] border-[#2A835F]/60"
                          : "bg-[#778873] border-[#778873]"
                      }`}
                    />
                  </div>
                </div>

                {/* 3 Mock Kanban / Project Columns */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div
                    className={`rounded-xl p-3 border ${
                      variant === "dark"
                        ? "bg-[#092328]/60 border-[#234641]"
                        : "bg-[#F1F3E0]/70 border-[#D2DCB6]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-xs opacity-60">
                      <span>Backlog</span>
                      <span className="rounded bg-current/10 px-1 text-[10px]">12</span>
                    </div>
                    <div className="space-y-2">
                      <div
                        className={`rounded-lg p-2.5 border ${
                          variant === "dark"
                            ? "bg-[#103A38] border-[#234641]"
                            : "bg-white border-[#D2DCB6]"
                        }`}
                      >
                        <div className="h-2.5 w-24 rounded bg-current/20 mb-1" />
                        <div className="h-2 w-12 rounded bg-current/10" />
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl p-3 border ${
                      variant === "dark"
                        ? "bg-[#092328]/60 border-[#234641]"
                        : "bg-[#F1F3E0]/70 border-[#D2DCB6]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-xs opacity-60">
                      <span>In Progress</span>
                      <span className="rounded bg-current/10 px-1 text-[10px]">5</span>
                    </div>
                    <div className="space-y-2">
                      <div
                        className={`rounded-lg p-2.5 border ${
                          variant === "dark"
                            ? "bg-[#103A38] border-[#2A835F]/50 text-[#8BBB92]"
                            : "bg-white border-[#A1BC98] text-[#586554]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`h-2 w-16 rounded ${
                              variant === "dark" ? "bg-[#2A835F]" : "bg-[#A1BC98]"
                            }`}
                          />
                          <span className="text-[10px] font-mono">SYN-204</span>
                        </div>
                        <div className="h-2.5 w-28 rounded bg-current/30 mb-1.5" />
                        <div className="flex items-center gap-1.5 text-[10px] font-medium">
                          <Sparkles className="size-3" /> AI Context Active
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl p-3 border ${
                      variant === "dark"
                        ? "bg-[#092328]/60 border-[#234641]"
                        : "bg-[#F1F3E0]/70 border-[#D2DCB6]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-xs opacity-60">
                      <span>Done</span>
                      <span className="rounded bg-current/10 px-1 text-[10px]">19</span>
                    </div>
                    <div className="space-y-2">
                      <div
                        className={`rounded-lg p-2.5 border ${
                          variant === "dark"
                            ? "bg-[#103A38] border-[#234641]"
                            : "bg-white border-[#D2DCB6]"
                        }`}
                      >
                        <div className="h-2.5 w-22 rounded bg-current/20 mb-1" />
                        <div
                          className={`flex items-center gap-1 text-[10px] ${
                            variant === "dark" ? "text-[#8BBB92]" : "text-[#778873]"
                          }`}
                        >
                          <CheckCircle2 className="size-3" /> Verified
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : previewType === "ai" ? (
              <div className="space-y-3">
                <div
                  className={`rounded-xl p-4 border ${
                    variant === "dark"
                      ? "bg-[#092328]/60 border-[#234641]"
                      : "bg-[#F1F3E0]/70 border-[#D2DCB6]"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs mb-2 font-mono ${
                      variant === "dark" ? "text-[#8BBB92]" : "text-[#778873]"
                    }`}
                  >
                    <Sparkles className="size-3.5" /> SYNAPSE INTELLIGENCE PIPELINE
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div
                      className={`rounded-lg p-2 border ${
                        variant === "dark"
                          ? "bg-[#103A38] border-[#234641]"
                          : "bg-white border-[#D2DCB6]"
                      }`}
                    >
                      <div className="text-[10px] uppercase opacity-60">Input</div>
                      <div className="font-semibold text-xs">Context</div>
                    </div>
                    <div
                      className={`rounded-lg p-2 border ${
                        variant === "dark"
                          ? "bg-[#103A38] border-[#234641]"
                          : "bg-white border-[#D2DCB6]"
                      }`}
                    >
                      <div className="text-[10px] uppercase opacity-60">Analysis</div>
                      <div className="font-semibold text-xs">Intelligence</div>
                    </div>
                    <div
                      className={`rounded-lg p-2 border ${
                        variant === "dark"
                          ? "bg-[#103A38] border-[#234641]"
                          : "bg-white border-[#D2DCB6]"
                      }`}
                    >
                      <div className="text-[10px] uppercase opacity-60">Synthesis</div>
                      <div className="font-semibold text-xs">Signal</div>
                    </div>
                    <div
                      className={`rounded-lg p-2 border ${
                        variant === "dark"
                          ? "bg-[#12544F] border-[#2A835F] text-[#8BBB92]"
                          : "bg-[#D2DCB6]/50 border-[#A1BC98] text-[#263329]"
                      }`}
                    >
                      <div className="text-[10px] uppercase opacity-80">Output</div>
                      <div className="font-semibold text-xs">Action</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : previewType === "meeting" ? (
              <div className="space-y-2.5">
                <div
                  className={`rounded-xl p-3 border ${
                    variant === "dark"
                      ? "bg-[#092328]/60 border-[#234641]"
                      : "bg-[#F1F3E0]/70 border-[#D2DCB6]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold">Sprint 14 Sync Notes</span>
                    <span className="font-mono text-[10px] opacity-60">28 min audio transcribed</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div
                      className={`flex items-center gap-2 rounded px-2 py-1 ${
                        variant === "dark"
                          ? "bg-[#12544F]/40 text-[#8BBB92]"
                          : "bg-[#D2DCB6]/40 text-[#263329]"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          variant === "dark" ? "bg-[#8BBB92]" : "bg-[#778873]"
                        }`}
                      />
                      <span>Decision: Migrate payment provider payload to webhook V2</span>
                    </div>
                    <div className="flex items-center gap-2 rounded bg-amber-500/10 px-2 py-1 text-amber-500 dark:text-amber-300">
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      <span>Risk: Third-party latency spike if rate limits hit 500 req/min</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div
                  className={`size-12 rounded-2xl border flex items-center justify-center mb-3 ${
                    variant === "dark"
                      ? "bg-[#12544F]/40 border-[#234641] text-[#8BBB92]"
                      : "bg-[#D2DCB6]/40 border-[#D2DCB6] text-[#778873]"
                  }`}
                >
                  <Layers className="size-6" />
                </div>
                <h4 className="font-semibold text-sm tracking-tight mb-1">
                  {mockupTitle || alt}
                </h4>
                <p className="text-xs opacity-60 max-w-sm">
                  {mockupSubtitle || "Interactive product screenshot preview."}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Bar Info */}
          <div className="relative z-10 flex items-center justify-between text-xs opacity-60 border-t pt-3 border-current/10">
            <span className="font-mono text-[11px] truncate max-w-[200px]">{imageKey}</span>
            <div className="flex items-center gap-1 text-[11px]">
              <span>Synapse System</span>
              <ArrowUpRight className="size-3" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
