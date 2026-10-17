"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Sun, Moon } from "lucide-react";

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerBooleanSnapshot() {
  return false;
}

export function SynapseSaaSNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerBooleanSnapshot
  );

  const toggleDarkMode = () => {
    const next = !isDark;
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
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Product", href: "#preview" },
    { label: "Capabilities", href: "#capabilities" },
    { label: "Workflow", href: "#workflow" },
    { label: "Why Synapse", href: "#why" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 px-4 sm:px-6 lg:px-10 py-3.5 sm:py-4 ${
        scrolled
          ? "bg-background/90 dark:bg-[#0B2220]/90 backdrop-blur-md border-b border-border/60 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        {/* LEFT: Synapse Brand Pill (matching reference navbar pill) */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-border/80 bg-card/80 dark:bg-card/40 backdrop-blur-md hover:border-primary/50 transition-colors shadow-2xs group"
          >
            <div className="size-6 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center p-0.5">
              <Image
                src="/logo.png"
                alt="Synapse"
                width={20}
                height={20}
                className="size-full object-contain"
                priority
              />
            </div>
            <span className="font-sans text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
              Synapse
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
              AI
            </span>
          </Link>
        </div>

        {/* CENTER: Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-3.5 py-1.5 text-xs lg:text-sm font-medium text-foreground/75 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* RIGHT: Actions (Theme Toggle + Login + Get Started) */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Dual-Theme Switcher */}
          <button
            onClick={toggleDarkMode}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="inline-flex items-center justify-center size-9 rounded-full border border-border/80 bg-card/70 hover:bg-card text-foreground transition-all cursor-pointer shadow-2xs"
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-muted-foreground" />
            )}
          </button>

          {/* Login button (Reference style dark button) */}
          <Link
            href="/login"
            className="px-4 py-2 text-xs lg:text-sm font-medium rounded-xl border border-border bg-card/80 hover:bg-card text-foreground shadow-2xs transition-all"
          >
            Log in
          </Link>

          {/* Primary CTA (Reference style filled button) */}
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs lg:text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-[var(--button-primary-hover)] shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center size-8 rounded-full border border-border bg-card text-foreground"
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="size-3.5 text-amber-400" />
            ) : (
              <Moon className="size-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center size-9 rounded-xl border border-border bg-card text-foreground"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 p-5 rounded-2xl border border-border bg-background/95 dark:bg-[#0B2220]/95 backdrop-blur-xl shadow-xl animate-in fade-in duration-200 flex flex-col gap-3">
          <div className="flex flex-col gap-1 pb-3 border-b border-border">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-sm font-medium rounded-lg hover:bg-accent text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
