"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { CAPABILITY_CATEGORIES, FEATURE_SLIDES } from "./constants";
import { WebsiteImage } from "./WebsiteImage";

export function CategoryShowcaseSection() {
  const [activeCategory, setActiveCategory] = useState("planning");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleCategorySelect = (categoryId: string, slideIndex: number) => {
    setActiveCategory(categoryId);
    setCurrentSlideIndex(slideIndex);
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  };

  const currentSlide = FEATURE_SLIDES[currentSlideIndex];

  return (
    <section id="showcase" className="relative bg-background py-24 sm:py-32 border-b border-border text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-secondary font-bold mb-3">
            Product Capabilities
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-5">
            Designed for the rhythm of modern engineering.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every layer of the software delivery lifecycle connected in one synchronized workspace.
          </p>
        </div>

        {/* HORIZONTAL CATEGORY NAVIGATION STRIP */}
        <div className="mb-12 sm:mb-16">
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            {CAPABILITY_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id, cat.slideIndex)}
                  className={`px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-card text-foreground/80 hover:bg-accent/40 hover:text-foreground border border-border shadow-xs"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LARGE EDITORIAL FEATURE SHOWCASE CARD */}
        <div className="mx-auto max-w-6xl">
          <div className="relative rounded-3xl bg-card border border-border shadow-xl p-6 sm:p-10 lg:p-12 overflow-hidden text-foreground">
            {/* Top Bar inside showcase */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-8 mb-8">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-secondary mb-2">
                  <span className="size-2 rounded-full bg-secondary" />
                  {currentSlide.tag}
                </span>
                <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  {currentSlide.title}
                </h3>
              </div>

              {/* Navigation Arrows & Counter */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {currentSlideIndex + 1} / {FEATURE_SLIDES.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={prevSlide}
                    aria-label="Previous Slide"
                    className="size-10 rounded-full border border-border bg-card hover:bg-accent/40 flex items-center justify-center text-foreground transition-colors shadow-xs cursor-pointer"
                  >
                    <ChevronLeft className="size-4.5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    aria-label="Next Slide"
                    className="size-10 rounded-full border border-border bg-card hover:bg-accent/40 flex items-center justify-center text-foreground transition-colors shadow-xs cursor-pointer"
                  >
                    <ChevronRight className="size-4.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Description & Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-center">
              <p className="lg:col-span-8 text-base sm:text-lg text-muted-foreground leading-relaxed">
                {currentSlide.description}
              </p>
              <div className="lg:col-span-4 flex items-center lg:justify-end gap-2 text-xs font-semibold text-secondary bg-secondary/15 px-4 py-2.5 rounded-xl border border-secondary/30">
                <CheckCircle2 className="size-4" />
                <span>{currentSlide.metrics}</span>
              </div>
            </div>

            {/* Expansive Showcase Image Mockup */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
              <WebsiteImage
                imageKey={currentSlide.imageKey}
                alt={currentSlide.title}
                aspectRatio="wide"
                variant={isDark ? "dark" : "light"}
                previewType="dashboard"
                mockupTitle={currentSlide.title}
                mockupSubtitle={currentSlide.description}
                className="hover:scale-[1.01] transition-transform duration-500"
              />
            </div>

            {/* Slide Pagination Dots */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {FEATURE_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                    currentSlideIndex === idx ? "w-8 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
