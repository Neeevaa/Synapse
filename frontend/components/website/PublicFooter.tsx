"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export function PublicFooter() {
  const footerLinks = {
    product: [
      { name: "Features", href: "#features" },
      { name: "Project Management", href: "#features" },
      { name: "Requirements", href: "#features" },
      { name: "Meeting Intelligence", href: "#ai" },
      { name: "AI Test Cases", href: "#ai" },
      { name: "Knowledge Base", href: "#search" },
      { name: "Analytics", href: "#stats" },
      { name: "Pricing", href: "#pricing" },
    ],
    solutions: [
      { name: "Project Managers", href: "#roles" },
      { name: "Engineering Teams", href: "#roles" },
      { name: "Team Leads", href: "#roles" },
      { name: "CTOs", href: "#roles" },
      { name: "Software Teams", href: "#roles" },
    ],
    resources: [
      { name: "Documentation", href: "#resources" },
      { name: "FAQ", href: "#faq" },
      { name: "Research", href: "#resources" },
      { name: "Product Overview", href: "#showcase" },
      { name: "Contact", href: "mailto:support@synapse.engineering" },
    ],
    company: [
      { name: "About Synapse", href: "#features" },
      { name: "Security Architecture", href: "#faq" },
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
    ],
  };

  return (
    <footer id="footer" className="relative bg-[#0B1015] border-t border-white/[0.08] text-white pt-20 pb-12">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        
        {/* TOP ROW: BRAND & COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 pb-16 border-b border-white/[0.08]">
          
          {/* LEFT: Synapse Brand & Tagline */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="size-9 rounded-xl bg-white/[0.06] p-1 border border-white/10 group-hover:border-[#2D7A5B]/50 transition-colors">
                <Image
                  src="/logo.png"
                  alt="Synapse"
                  width={36}
                  height={36}
                  className="size-full object-contain"
                />
              </div>
              <span className="font-sans text-xl font-bold tracking-tight text-white group-hover:text-[#3F9B73] transition-colors">
                Synapse
              </span>
            </Link>

            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              AI-powered project intelligence for modern software teams. Connecting planning, requirements, and execution.
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-[#3F9B73]">
                <span className="size-1.5 rounded-full bg-[#3F9B73] animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Multi-Column Links */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            
            {/* Product Column */}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-white/40 font-semibold mb-4">
                Product
              </div>
              <ul className="space-y-2.5">
                {footerLinks.product.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions Column */}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-white/40 font-semibold mb-4">
                Solutions
              </div>
              <ul className="space-y-2.5">
                {footerLinks.solutions.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-white/40 font-semibold mb-4">
                Resources
              </div>
              <ul className="space-y-2.5">
                {footerLinks.resources.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-white/40 font-semibold mb-4">
                Company
              </div>
              <ul className="space-y-2.5">
                {footerLinks.company.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

        {/* BOTTOM ROW: COPYRIGHT & LEGAL */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div>
            © 2026 Synapse. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white/80 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/80 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/80 transition-colors">Security</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
