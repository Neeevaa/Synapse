"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { NAV_DROPDOWNS } from "./constants";

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("synapse_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("synapse_theme", "light");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border py-3.5 shadow-md shadow-black/10"
          : "bg-transparent py-5 border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          {/* LEFT: Synapse Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
          >
            <div className="relative size-8 sm:size-9 overflow-hidden rounded-xl bg-card p-1 border border-border group-hover:border-primary/50 transition-colors shadow-2xs">
              <Image
                src="/logo.png"
                alt="Synapse"
                width={36}
                height={36}
                className="size-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                Synapse
              </span>
            </div>
          </Link>

          {/* CENTER: Desktop Navigation & Dropdowns */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {/* Product Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("product")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                  activeDropdown === "product"
                    ? "text-foreground bg-accent/40"
                    : "text-foreground/80 hover:text-foreground hover:bg-accent/25"
                }`}
              >
                <span>Product</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    activeDropdown === "product" ? "rotate-180 text-primary" : "opacity-60"
                  }`}
                />
              </button>

              {activeDropdown === "product" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[440px] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/20">
                    <div className="grid gap-1">
                      {NAV_DROPDOWNS.product.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={() => setActiveDropdown(null)}
                          className="group/item flex flex-col p-2.5 rounded-xl hover:bg-accent/30 transition-colors"
                        >
                          <span className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            {item.desc}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("solutions")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                  activeDropdown === "solutions"
                    ? "text-foreground bg-accent/40"
                    : "text-foreground/80 hover:text-foreground hover:bg-accent/25"
                }`}
              >
                <span>Solutions</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    activeDropdown === "solutions" ? "rotate-180 text-primary" : "opacity-60"
                  }`}
                />
              </button>

              {activeDropdown === "solutions" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[380px] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/20">
                    <div className="grid gap-1">
                      {NAV_DROPDOWNS.solutions.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={() => setActiveDropdown(null)}
                          className="group/item flex flex-col p-2.5 rounded-xl hover:bg-accent/30 transition-colors"
                        >
                          <span className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            {item.desc}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("resources")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                  activeDropdown === "resources"
                    ? "text-foreground bg-accent/40"
                    : "text-foreground/80 hover:text-foreground hover:bg-accent/25"
                }`}
              >
                <span>Resources</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    activeDropdown === "resources" ? "rotate-180 text-primary" : "opacity-60"
                  }`}
                />
              </button>

              {activeDropdown === "resources" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[340px] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/20">
                    <div className="grid gap-1">
                      {NAV_DROPDOWNS.resources.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          onClick={() => setActiveDropdown(null)}
                          className="group/item flex flex-col p-2.5 rounded-xl hover:bg-accent/30 transition-colors"
                        >
                          <span className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            {item.desc}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Direct Link */}
            <a
              href="#pricing"
              className="px-3.5 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent/25 rounded-full transition-colors"
            >
              Pricing
            </a>
          </nav>

          {/* RIGHT: Theme Toggle & CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Dual-Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Switch to Light Theme (Soft Sage)" : "Switch to Dark Theme (Ocean Forest)"}
              className="inline-flex items-center justify-center size-9 rounded-xl border border-border bg-card text-foreground hover:bg-accent/40 transition-colors cursor-pointer shadow-2xs"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-muted-foreground" />
              )}
            </button>

            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-foreground/90 hover:text-foreground hover:bg-accent/30 rounded-xl transition-all"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-[var(--button-primary-hover)] transition-all active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Right Bar */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              className="inline-flex items-center justify-center size-9 rounded-xl border border-border bg-card text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center size-9 rounded-xl bg-card border border-border text-foreground hover:bg-accent/40 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>

          {/* Tablet Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hidden sm:flex lg:hidden items-center justify-center size-10 rounded-xl bg-card border border-border text-foreground hover:bg-accent/40 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE FULL-SCREEN OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[65px] z-40 bg-background/98 backdrop-blur-2xl p-6 flex flex-col justify-between overflow-y-auto lg:hidden animate-in fade-in duration-200">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest text-secondary font-bold">
                Navigation
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  Product Capabilities
                </a>
                <a
                  href="#showcase"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  Feature Showcase
                </a>
                <a
                  href="#ai"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  AI Intelligence
                </a>
                <a
                  href="#workflow"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  Workflow
                </a>
                <a
                  href="#search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  Semantic Search
                </a>
                <a
                  href="#roles"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  Roles & Alignment
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-lg font-medium text-foreground hover:text-primary border-b border-border"
                >
                  FAQ
                </a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-accent/40 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3.5 rounded-xl bg-primary hover:bg-[var(--button-primary-hover)] text-primary-foreground font-semibold shadow-md transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
