"use client";

import React from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { PLANS_LIST } from "@/lib/plans";

export function PricingPreviewSection() {
  return (
    <section id="pricing" className="relative bg-background py-24 sm:py-32 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.08]">
            Predictable plans for <br />
            software teams of every scale.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Start free, scale seamlessly. Real-time entitlements with zero surprise charges.
          </p>
        </div>

        {/* 4 PRICING CARDS FROM LIB/PLANS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
          {PLANS_LIST.map((plan) => {
            const isPopular = plan.is_popular;
            return (
              <div
                key={plan.id}
                className={`group relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 bg-card text-foreground ${
                  isPopular
                    ? "border-2 border-primary ring-2 ring-primary/25 shadow-2xl lg:-translate-y-3"
                    : "border border-border shadow-md hover:border-primary/40"
                }`}
              >
                {/* Popular Pill */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-primary-foreground shadow-md">
                    <Sparkles className="size-3" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      {plan.name}
                    </h3>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {plan.id}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed mb-6 min-h-[36px] text-muted-foreground">
                    {plan.description}
                  </p>

                  {/* Price display */}
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                      {plan.price}
                    </div>
                    {plan.billing_period && plan.price !== "Custom" && (
                      <span className="text-xs text-muted-foreground">
                        Billed monthly per organization
                      </span>
                    )}
                  </div>

                  {/* Included features */}
                  <div className="space-y-3 mb-8">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-secondary font-bold">
                      Included Features
                    </div>
                    {plan.included_features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-foreground/80">
                        <Check className="size-3.5 mt-0.5 shrink-0 text-secondary" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan CTA Button */}
                <div className="pt-4 mt-auto">
                  <Link
                    href={`/register?plan=${plan.id}`}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] ${
                      isPopular
                        ? "bg-primary hover:bg-[var(--button-primary-hover)] text-primary-foreground shadow-md"
                        : "bg-secondary/20 hover:bg-secondary/30 text-foreground border border-secondary/40 font-semibold"
                    }`}
                  >
                    <span>{plan.cta_text || "Get Started"}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
