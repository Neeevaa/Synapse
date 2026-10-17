'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PLAN_DEFINITIONS, SubscriptionPlanId } from '@/lib/plans';

export function SynapsePricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const planKeys: SubscriptionPlanId[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];

  return (
    <section id="pricing" className="relative py-20 px-4 md:px-8 border-t border-[var(--syn-border)] overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[var(--syn-border)] bg-[var(--syn-chip-bg)] text-[var(--syn-chip-text)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--syn-accent)]" />
            TRANSPARENT SUBSCRIPTION
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[var(--syn-text-primary)]">
            Simple, Transparent Plans
          </h2>
          <p className="mt-4 text-base md:text-lg text-[var(--syn-text-secondary)] leading-relaxed">
            Scale seamlessly from individual side projects to multi-team engineering organizations.
            No hidden quotas or surprise billings.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-full bg-[var(--syn-surface-card)] border border-[var(--syn-border)]">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[var(--syn-accent)] text-white shadow-sm'
                  : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-[var(--syn-accent)] text-white shadow-sm'
                  : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planKeys.map((planId) => {
            const plan = PLAN_DEFINITIONS[planId];
            const isPopular = plan.is_popular;

            // Calculate annual discounted price display if selected
            let priceDisplay = plan.price;
            let periodDisplay = '/ month';

            if (plan.price_inr !== null && plan.price_inr > 0) {
              if (billingCycle === 'annual') {
                const discountedMonthly = Math.round(plan.price_inr * 0.8);
                priceDisplay = `₹${discountedMonthly.toLocaleString('en-IN')}`;
                periodDisplay = '/ mo (billed yearly)';
              } else {
                priceDisplay = `₹${plan.price_inr.toLocaleString('en-IN')}`;
                periodDisplay = '/ month';
              }
            } else if (planId === 'FREE') {
              priceDisplay = '₹0';
              periodDisplay = 'forever free';
            } else if (planId === 'ENTERPRISE') {
              priceDisplay = 'Custom';
              periodDisplay = 'tailored SLAs';
            }

            return (
              <div
                key={planId}
                className={`relative flex flex-col justify-between p-6 md:p-7 rounded-3xl transition-all duration-300 ${
                  isPopular
                    ? 'bg-[var(--syn-surface-card)] border-2 border-[var(--syn-accent)] shadow-2xl shadow-[var(--syn-accent)]/10 scale-[1.02] z-20'
                    : 'bg-[var(--syn-surface-card)] border border-[var(--syn-border)] shadow-md hover:border-[var(--syn-border-focus)] hover:shadow-lg'
                }`}
              >
                {/* Popular Pill */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--syn-accent)] text-white text-[11px] font-bold tracking-wider uppercase shadow-md shadow-[var(--syn-accent)]/30">
                    Most Popular
                  </div>
                )}

                <div>
                  {/* Title & Desc */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[var(--syn-text-primary)]">{plan.name}</h3>
                    <span className="text-[11px] font-mono font-medium text-[var(--syn-text-muted)] uppercase">
                      {planId}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--syn-text-secondary)] min-h-[32px] leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price Block */}
                  <div className="mt-6 pb-6 border-b border-[var(--syn-border)]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--syn-text-primary)]">
                        {priceDisplay}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--syn-text-muted)] mt-1">{periodDisplay}</div>
                  </div>

                  {/* Limits summary */}
                  <div className="py-4 border-b border-[var(--syn-border)] text-xs text-[var(--syn-text-secondary)] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--syn-text-muted)]">Team members:</span>
                      <span className="font-semibold text-[var(--syn-text-primary)]">
                        {plan.limits.max_team_members === -1 ? 'Unlimited' : `${plan.limits.max_team_members} seats`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--syn-text-muted)]">Active projects:</span>
                      <span className="font-semibold text-[var(--syn-text-primary)]">
                        {plan.limits.max_active_projects === -1 ? 'Unlimited' : `${plan.limits.max_active_projects} projects`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--syn-text-muted)]">Cloud storage:</span>
                      <span className="font-semibold text-[var(--syn-text-primary)]">
                        {plan.limits.max_storage_display}
                      </span>
                    </div>
                  </div>

                  {/* Key Features */}
                  <div className="mt-5 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--syn-text-muted)]">
                      Included Capabilities
                    </div>
                    <ul className="space-y-2">
                      {plan.included_features.slice(0, 5).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-[var(--syn-text-secondary)]">
                          <span className="text-emerald-500 font-bold shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan CTA */}
                <div className="mt-8 pt-4">
                  <Link
                    href={`/register?plan=${planId}`}
                    className={`w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
                      isPopular
                        ? 'bg-[var(--syn-accent)] text-white hover:bg-[var(--syn-accent-hover)] shadow-md shadow-[var(--syn-accent)]/20'
                        : 'bg-[var(--syn-surface-elevated)] border border-[var(--syn-border)] text-[var(--syn-text-primary)] hover:border-[var(--syn-accent)] hover:text-[var(--syn-accent)]'
                    }`}
                  >
                    {plan.cta_text}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Footnote */}
        <p className="mt-8 text-center text-xs text-[var(--syn-text-muted)]">
          All plans include full TLS encryption, automated backups, and 99.9% uptime SLA. Need a custom compliance review or private VPC deployment?{' '}
          <Link href="/register?plan=ENTERPRISE" className="text-[var(--syn-accent)] hover:underline font-medium">
            Talk to our engineering team
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
