"use client";

import React from "react";
import { Check, Bot, Sparkles, User, AlertCircle, Loader2 } from "lucide-react";

export type StepStatus = "completed" | "current" | "pending" | "blocked";
export type StepOwnerType = "user" | "ai" | "system";

export interface WorkflowOwnerDisplay {
  name: string;
  avatarUrl?: string | null;
  initials?: string;
  role?: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  status: StepStatus;
  ownerType: StepOwnerType;
  ownerDisplay: WorkflowOwnerDisplay;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
}

export interface WorkflowProgressTrackerProps {
  steps: WorkflowStep[];
  currentStepId?: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  showDetailsPanel?: boolean;
  progressPercent?: number;
}

export default function WorkflowProgressTracker({
  steps,
  currentStepId,
  onStepClick,
  className = "",
  title,
  subtitle,
  showDetailsPanel = true,
  progressPercent,
}: WorkflowProgressTrackerProps) {
  // Find current step: by currentStepId or first step with status === "current"
  const currentStep =
    steps.find((s) => s.id === currentStepId) ||
    steps.find((s) => s.status === "current") ||
    steps[steps.length - 1];

  const currentIndex = steps.findIndex((s) => s.id === currentStep?.id);

  // Helper to render owner icon/avatar inside node
  const renderOwnerInsideNode = (step: WorkflowStep) => {
    if (step.ownerType === "ai") {
      return <Bot className="size-4 text-emerald-400" />;
    }
    if (step.ownerDisplay.avatarUrl) {
      return (
        <img
          src={step.ownerDisplay.avatarUrl}
          alt={step.ownerDisplay.name}
          className="size-full object-cover rounded-md"
        />
      );
    }
    if (step.ownerDisplay.initials) {
      return (
        <span className="text-[11px] font-bold text-emerald-300">
          {step.ownerDisplay.initials}
        </span>
      );
    }
    return <User className="size-3.5 text-emerald-300" />;
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-100 p-5 md:p-6 shadow-sm space-y-6 ${className}`}
    >
      {/* Tracker Header if title provided */}
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            {title && <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          {currentStep && (
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Step {currentIndex + 1} of {steps.length}: {currentStep.label}
              {typeof progressPercent === "number" && (
                <span className="ml-1 pl-1.5 border-l border-emerald-500/30 font-mono text-[11px] text-emerald-300">
                  {progressPercent}%
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* HORIZONTAL LINEAR WORKFLOW TRACK */}
      <div className="relative pt-2 pb-2">
        <div className="flex items-center justify-between relative w-full">
          {steps.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";
            const isBlocked = step.status === "blocked";
            const isPending = step.status === "pending";
            const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

            // Track line connection to next step
            const isLast = idx === steps.length - 1;
            const nextStep = steps[idx + 1];
            const isTrackActive = isCompleted && (nextStep?.status === "completed" || nextStep?.status === "current");

            return (
              <React.Fragment key={step.id}>
                {/* STEP NODE + LABEL */}
                <div
                  onClick={() => isClickable && onStepClick && onStepClick(step.id)}
                  className={`flex flex-col items-center group relative z-10 select-none ${
                    isClickable ? "cursor-pointer" : "cursor-default"
                  }`}
                  style={{ width: "120px" }}
                >
                  {/* NODE INDICATOR */}
                  <div className="relative flex items-center justify-center">
                    {isCompleted ? (
                      /* COMPLETED STEP: Clean green circle with check mark */
                      <div className="size-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
                        <Check className="size-4 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      /* ACTIVE / CURRENT STEP: Rounded capsule/square with owner icon inside */
                      <div className="size-9 rounded-xl border-2 border-emerald-400 bg-slate-950 flex items-center justify-center shadow-md ring-4 ring-emerald-500/20 transition-transform duration-200 group-hover:scale-105">
                        {renderOwnerInsideNode(step)}
                      </div>
                    ) : isBlocked ? (
                      /* BLOCKED STEP */
                      <div className="size-8 rounded-full border border-rose-700 bg-rose-950/60 text-rose-400 flex items-center justify-center">
                        <AlertCircle className="size-4" />
                      </div>
                    ) : (
                      /* PENDING / FUTURE STEP: Understated circle */
                      <div className="size-8 rounded-full border border-slate-700/80 bg-slate-950/60 text-slate-400 flex items-center justify-center text-xs font-semibold">
                        <span>{idx + 1}</span>
                      </div>
                    )}
                  </div>

                  {/* STEP LABEL (Minimum font size 12px) */}
                  <div className="mt-2.5 text-center px-1">
                    <p
                      className={`text-xs leading-snug transition-colors ${
                        isCurrent
                          ? "font-bold text-emerald-400 tracking-tight"
                          : isCompleted
                          ? "font-semibold text-slate-200 group-hover:text-white"
                          : "font-medium text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    {/* Owner hint under label */}
                    <span className="hidden sm:block text-[11px] text-slate-400 mt-0.5 truncate max-w-[110px]">
                      {step.ownerType === "ai" ? "AI Engine" : step.ownerDisplay.name.split(" ")[0]}
                    </span>
                  </div>
                </div>

                {/* CONNECTING LINE SEGMENT BETWEEN NODES */}
                {!isLast && (
                  <div className="flex-1 h-0.5 -mt-6 mx-1 relative z-0">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isTrackActive
                          ? "bg-emerald-500"
                          : isCompleted
                          ? "bg-emerald-500/50"
                          : "bg-slate-800"
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* COMPACT CURRENT STEP DETAILS PANEL */}
      {showDetailsPanel && currentStep && (
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-inner">
          {/* LEFT: STEP CONTEXT */}
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Current Step • {currentIndex + 1} of {steps.length}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">{currentStep.label}</h4>
            {currentStep.description && (
              <p className="text-xs text-slate-300 leading-relaxed">{currentStep.description}</p>
            )}
          </div>

          {/* MIDDLE: OWNER IDENTITY */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 rounded-xl shrink-0">
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              {currentStep.ownerType === "ai" ? (
                <Bot className="size-4 text-emerald-400" />
              ) : (
                <User className="size-4 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Step Owner
              </span>
              <p className="text-xs font-bold text-slate-100 truncate max-w-[150px]">
                {currentStep.ownerDisplay.name}
              </p>
              {currentStep.ownerDisplay.role && (
                <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                  {currentStep.ownerDisplay.role}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: PRIMARY NEXT ACTION CTA */}
          {currentStep.actionText && currentStep.onAction && (
            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={currentStep.onAction}
                disabled={currentStep.actionDisabled || currentStep.actionLoading}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
              >
                {currentStep.actionLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>{currentStep.actionText}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
