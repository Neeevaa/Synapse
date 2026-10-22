"use client";

import React from "react";
import {
  FileCheck2,
  MessageSquareCode,
  Kanban,
  TestTube2,
  Database,
  TrendingUp,
  GitBranch,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { SynapseModuleConfig } from "./synapse-modules";

interface ModuleNodeProps {
  module: SynapseModuleConfig;
  isActive: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ModuleNode({
  module,
  isActive,
  onHover,
  onClick,
  className = "",
  style,
}: ModuleNodeProps) {
  const renderIcon = () => {
    const props = { className: "size-3.5 sm:size-4 transition-transform duration-200" };
    switch (module.iconName) {
      case "FileCheck2":
        return <FileCheck2 {...props} />;
      case "MessageSquareCode":
        return <MessageSquareCode {...props} />;
      case "Kanban":
        return <Kanban {...props} />;
      case "TestTube2":
        return <TestTube2 {...props} />;
      case "Database":
        return <Database {...props} />;
      case "TrendingUp":
        return <TrendingUp {...props} />;
      case "GitBranch":
        return <GitBranch {...props} />;
      case "AlertTriangle":
        return <AlertTriangle {...props} />;
      default:
        return <FileCheck2 {...props} />;
    }
  };

  return (
    <div
      style={style}
      className={`relative group ${className}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Sleek Small Node Button */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`${module.name} - ${module.shortName}`}
        className={`relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer outline-none select-none text-left backdrop-blur-md border shadow-xs ${
          isActive
            ? "bg-[#06858E] text-white border-[#06858E] ring-3 ring-[#06858E]/30 scale-105 shadow-md shadow-[#06858E]/25 z-40"
            : "bg-card/90 hover:bg-card text-foreground border-border/80 hover:border-[#06858E]/50 hover:scale-102"
        }`}
      >
        {/* Compact Icon */}
        <div
          className={`size-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isActive ? "bg-white/20 text-white" : "bg-[#06858E]/10 text-[#06858E] group-hover:bg-[#06858E]/20"
          }`}
        >
          {renderIcon()}
        </div>

        {/* Small Node Name */}
        <span className="text-xs font-medium tracking-tight whitespace-nowrap">
          {module.shortName}
        </span>

        {/* Live indicator dot */}
        <span
          className={`size-1.5 rounded-full shrink-0 ${
            isActive ? "bg-white animate-pulse" : "bg-emerald-500 animate-pulse"
          }`}
        />
      </button>

      {/* Floating Small Description Tooltip on Hover */}
      {isActive && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 sm:w-64 p-3 rounded-xl bg-card/98 dark:bg-card/95 border border-border shadow-xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 text-left"
          role="tooltip"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/60">
            <span className="text-xs font-semibold text-foreground">
              {module.name}
            </span>
            <span className="text-[10px] font-mono text-[#06858E] flex items-center gap-0.5 shrink-0">
              Open <ArrowRight className="size-2.5" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {module.description}
          </p>
        </div>
      )}
    </div>
  );
}
