"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { FAQ_ITEMS } from "./constants";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="relative bg-background py-24 sm:py-32 lg:py-40 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold block mb-3">
            Questions & Answers
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.08]">
            Frequently asked questions
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Everything you need to know about getting started with Synapse.
          </p>
        </div>

        {/* MINIMALIST ACCORDION ROWS */}
        <div className="mx-auto max-w-4xl divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-6 sm:py-8 transition-colors">
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors pr-6">
                    {item.q}
                  </span>
                  <div
                    className={`size-9 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 ${
                      isOpen
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border group-hover:border-primary/50"
                    }`}
                  >
                    {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-4 sm:mt-5 pr-8 sm:pr-14 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
