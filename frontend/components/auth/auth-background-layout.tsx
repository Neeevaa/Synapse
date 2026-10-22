"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiagonalMarqueeCarousel } from "@/components/ui/great-ui-diagonal-marquee-carousel";

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

export interface AuthBackgroundLayoutProps {
  children: React.ReactNode;
  /** Maximum width constraint for the centered authentication card */
  cardMaxWidth?: "sm" | "md" | "lg" | "xl";
  /** Optional custom class for the outer card */
  cardClassName?: string;
  /** Whether to show a top navigation bar with back-to-home link. Default: true */
  showTopBar?: boolean;
  /** Optional bottom footer note */
  footerNote?: React.ReactNode;
}

const MAX_WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function AuthBackgroundLayout({
  children,
  cardMaxWidth = "md",
  cardClassName,
  showTopBar = true,
  footerNote,
}: AuthBackgroundLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground flex flex-col justify-between select-auto">
      {/* 1. ANIMATION LAYER: Full-Screen Diagonal Marquee (Fixed Background) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <DiagonalMarqueeCarousel
          angle={-22}
          speedSeconds={55}
          rowCount={6}
          cardWidth={380}
          cardHeight={240}
          rowGap={24}
          cardGap={24}
          cardOverlayOpacity={0.18}
        />

        {/* 2. READABILITY & CONTRAST VEIL LAYER */}
        {/* Light radial accent behind the card: preserves vivid photograph visibility while maintaining subtle focus */}
        <div className="absolute inset-0 bg-radial from-background/35 via-background/15 to-transparent dark:from-background/45 dark:via-background/20 dark:to-transparent pointer-events-none" />

        {/* Subtle Brand Atmospheric Ambient Glows */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* 3. TOP BAR: Back Navigation & Brand Identity */}
      {showTopBar && (
        <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between pointer-events-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-card/70 dark:bg-card/50 backdrop-blur-md border border-border/80 hover:border-primary/50 shadow-2xs transition-all cursor-pointer group"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Synapse</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Synapse Platform v2.4</span>
          </div>
        </header>
      )}

      {/* 4. MAIN FORM LAYER: Centered Floating Card */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8 sm:py-12 pointer-events-auto">
        <div
          className={cn(
            "w-full rounded-3xl border border-border/80 bg-card/95 dark:bg-card/90 backdrop-blur-xl shadow-2xl shadow-slate-950/15 dark:shadow-black/70 p-6 sm:p-10 transition-all duration-300",
            MAX_WIDTH_CLASSES[cardMaxWidth],
            cardClassName
          )}
        >
          {children}
        </div>
      </main>

      {/* 5. FOOTER: Security & Compliance Seal */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 py-4 text-center pointer-events-auto">
        {footerNote ? (
          footerNote
        ) : (
          <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/80 font-medium">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Enterprise-Grade Encryption • Zero Trust Workspace Governance</span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default AuthBackgroundLayout;
