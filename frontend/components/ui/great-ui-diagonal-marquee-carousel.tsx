"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AUTH_BACKGROUND_IMAGES,
  type AuthBackgroundImage,
} from "@/config/auth-background-images";

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

export interface DiagonalMarqueeCarouselProps {
  /** Array of background images/placeholders. Defaults to centralized config. */
  images?: AuthBackgroundImage[];
  /** Angle of diagonal tilt in degrees. Recommended: -20 to -25. Default: -22 */
  angle?: number;
  /** Duration of one full loop in seconds. Default: 55 */
  speedSeconds?: number;
  /** Number of staggered diagonal rows. Default: 5 */
  rowCount?: number;
  /** Width of photographic cards in pixels. Default: 360 */
  cardWidth?: number;
  /** Height of photographic cards in pixels. Default: 230 */
  cardHeight?: number;
  /** Gap between rows in pixels. Default: 22 */
  rowGap?: number;
  /** Gap between cards within a row in pixels. Default: 22 */
  cardGap?: number;
  /** Opacity of the dark tint layer over each photograph. Default: 0.35 */
  cardOverlayOpacity?: number;
  /** Additional container classes */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Individual Card Component with Graceful Fallback                   */
/* ------------------------------------------------------------------ */

interface MarqueeCardProps {
  image: AuthBackgroundImage;
  width: number;
  height: number;
  overlayOpacity: number;
}

function MarqueeCard({
  image,
  width,
  height,
  overlayOpacity = 0.18,
}: MarqueeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // If higher-numbered placeholders (06, 07, 08) are not yet on disk,
  // gracefully cycle through the active user images (01 to 05) so all cards showcase photography
  const effectiveSrc = imageError
    ? `/images/auth-background/AUTH_BG_PLACEHOLDER_0${((image.id - 1) % 5) + 1}.jpg`
    : image.src;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 shadow-xl shadow-black/25 select-none transition-transform duration-300"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: image.fallbackGradient,
      }}
    >
      {/* Real Image Layer - Vivid & Comprehendable with ~20% soft transparency */}
      <img
        src={effectiveSrc}
        alt={image.alt || ""}
        loading="eager"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          if (!imageError) {
            setImageError(true);
          }
        }}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-500",
          imageLoaded ? "opacity-82" : "opacity-0"
        )}
      />

      {/* Abstract Texture & Geometric Accent when image is still loading */}
      {!imageLoaded && (
        <div className="absolute inset-0 opacity-25 pointer-events-none flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-white/70">
            <span>SYNAPSE • AMBIENT</span>
            <span>0{image.id}</span>
          </div>
          <div className="space-y-1">
            <div className="h-0.5 w-12 bg-white/40 rounded-full" />
            <p className="text-[11px] font-sans font-medium text-white/80 line-clamp-1">
              {image.title}
            </p>
          </div>
        </div>
      )}

      {/* Subtle 18% Dark Overlay to Harmonize with Interface without Obscuring Subject Matter */}
      <div
        className="absolute inset-0 bg-slate-950 pointer-events-none transition-opacity duration-300"
        style={{ opacity: overlayOpacity }}
      />

      {/* Subtle Inner Highlight Border */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15 pointer-events-none" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single Marquee Row Component                                       */
/* ------------------------------------------------------------------ */

interface MarqueeRowProps {
  images: AuthBackgroundImage[];
  direction: "left" | "right";
  durationSeconds: number;
  cardWidth: number;
  cardHeight: number;
  cardGap: number;
  overlayOpacity: number;
  startIndex: number;
}

function MarqueeRow({
  images,
  direction,
  durationSeconds,
  cardWidth,
  cardHeight,
  cardGap,
  overlayOpacity,
  startIndex,
}: MarqueeRowProps) {
  // Re-order the images array starting from startIndex for visual diversity
  const rowImages = useMemo(() => {
    if (images.length === 0) return [];
    const rotated = [
      ...images.slice(startIndex % images.length),
      ...images.slice(0, startIndex % images.length),
    ];
    // Duplicate 3 times to ensure infinite seamless looping across wide viewports
    return [...rotated, ...rotated, ...rotated];
  }, [images, startIndex]);

  const animationClass =
    direction === "left"
      ? "animate-diagonal-marquee-left"
      : "animate-diagonal-marquee-right";

  return (
    <div
      className={cn("flex shrink-0 items-center", animationClass)}
      style={
        {
          gap: `${cardGap}px`,
          "--marquee-duration": `${durationSeconds}s`,
        } as React.CSSProperties
      }
    >
      {rowImages.map((img, idx) => (
        <MarqueeCard
          key={`${img.id}-${idx}`}
          image={img}
          width={cardWidth}
          height={cardHeight}
          overlayOpacity={overlayOpacity}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Diagonal Marquee Carousel Component                           */
/* ------------------------------------------------------------------ */

export function DiagonalMarqueeCarousel({
  images = AUTH_BACKGROUND_IMAGES,
  angle = -22,
  speedSeconds = 55,
  rowCount = 5,
  cardWidth = 360,
  cardHeight = 230,
  rowGap = 22,
  cardGap = 22,
  cardOverlayOpacity = 0.18,
  className,
}: DiagonalMarqueeCarouselProps) {
  // Generate configuration for each row with alternating directions and staggered rhythms
  const rows = useMemo(() => {
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const isEven = rowIndex % 2 === 0;
      // Slight natural variation in duration between rows (e.g. 52s, 56s, 54s)
      const durationVariation = isEven ? speedSeconds : speedSeconds * 1.08;
      return {
        id: rowIndex,
        direction: (isEven ? "left" : "right") as "left" | "right",
        durationSeconds: Math.round(durationVariation),
        startIndex: rowIndex * 2,
      };
    });
  }, [rowCount, speedSeconds]);

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none z-0",
        className
      )}
      aria-hidden="true"
    >
      {/* Oversized, Centered, and Rotated Plane */}
      <div
        className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center will-change-transform"
        style={{
          width: "220vw",
          height: "220vh",
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          gap: `${rowGap}px`,
        }}
      >
        {rows.map((row) => (
          <MarqueeRow
            key={row.id}
            images={images}
            direction={row.direction}
            durationSeconds={row.durationSeconds}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardGap={cardGap}
            overlayOpacity={cardOverlayOpacity}
            startIndex={row.startIndex}
          />
        ))}
      </div>

      {/* Gentle, Restrained Edge Fades to Prevent Hard Cuts without Washing Out Imagery */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/15 via-transparent to-background/15 pointer-events-none" />
    </div>
  );
}

export default DiagonalMarqueeCarousel;
