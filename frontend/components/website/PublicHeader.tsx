"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Sun, Moon, Compass } from "lucide-react";
import { HOMEPAGE_NAV_ITEMS } from "./scrollSections";

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

export function PublicHeader() {
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
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? isDark
            ? "bg-[#071716]/90 backdrop-blur-md border-b border-[#258663]/30 py-3.5 shadow-lg shadow-black/30"
            : "bg-white/90 backdrop-blur-md border-b border-[#D2E7DF] py-3.5 shadow-md shadow-black/5"
          : "bg-transparent py-4 sm:py-5 border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1720px] px-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          {/* LEFT: Synapse Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#258663] rounded-xl p-1"
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

          {/* CENTER: Desktop Platform Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {HOMEPAGE_NAV_ITEMS.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`px-3.5 py-1.5 text-xs xl:text-sm font-medium rounded-full transition-all duration-200 ${
                  isDark
                    ? "text-[#A8D6CF]/80 hover:text-white hover:bg-[#103A38]/60"
                    : "text-[#173D3A]/80 hover:text-[#173D3A] hover:bg-white/80 shadow-2xs"
                }`}
              >
                <span>{item.name}</span>
              </a>
            ))}
          </nav>

          {/* RIGHT: Theme Toggle & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Dual-Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              className={`inline-flex items-center justify-center size-9 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                isDark
                  ? "border-[#258663]/40 bg-[#103A38]/70 text-amber-400 hover:bg-[#103A38]"
                  : "border-[#D2E7DF] bg-white/80 text-muted-foreground hover:bg-white"
              }`}
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
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                isDark
                  ? "text-[#A8D6CF] hover:text-white hover:bg-[#103A38]/60"
                  : "text-[#173D3A] hover:bg-white/80"
              }`}
            >
              Login
            </Link>

            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-[#1C6F51] transition-all active:scale-[0.98]"
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
              className={`inline-flex items-center justify-center size-9 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? "border-[#258663]/40 bg-[#103A38]/70 text-amber-400"
                  : "border-[#D2E7DF] bg-white text-muted-foreground"
              }`}
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
              className="flex items-center justify-center size-9 rounded-xl bg-card border border-border text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>

          {/* Tablet Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hidden sm:flex lg:hidden items-center justify-center size-10 rounded-xl bg-card border border-border text-foreground hover:bg-accent/40 transition-colors cursor-pointer"
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
              <div className="text-xs font-mono uppercase tracking-widest text-[#258663] font-bold flex items-center gap-2">
                <Compass className="size-3.5" />
                <span>Platform Navigation</span>
              </div>
              <div className="flex flex-col gap-2">
                {HOMEPAGE_NAV_ITEMS.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3 px-3 rounded-xl text-base font-semibold text-foreground hover:text-primary hover:bg-accent/40 border-b border-border flex flex-col"
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground font-normal mt-0.5">
                      {item.desc}
                    </span>
                  </a>
                ))}
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
              className="w-full text-center py-3.5 rounded-xl bg-primary hover:bg-[#1C6F51] text-primary-foreground font-semibold shadow-md transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
