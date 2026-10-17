'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Copy, Check, Eye, Code } from 'lucide-react';

interface PlaceholderImageFrameProps {
  imagePath: string; // e.g. '/images/website/hero-workspace-mockup.svg'
  alt: string;
  width: number;
  height: number;
  aspectRatio?: string;
  label: string;
  description: string;
  interactiveComponent?: React.ReactNode;
}

export function PlaceholderImageFrame({
  imagePath,
  alt,
  width,
  height,
  label,
  description,
  interactiveComponent,
}: PlaceholderImageFrameProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'image' | 'interactive'>('image');

  const handleCopyPath = () => {
    navigator.clipboard.writeText(`public${imagePath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tp-placeholder-box my-4 group">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[var(--tp-bg-elevated)] border-b border-[var(--tp-border-subtle)] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[var(--tp-brand-primary)] text-white">
            <ImageIcon className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold text-[var(--tp-text-primary)]">{label}</span>
          <span className="text-[11px] text-[var(--tp-text-muted)] hidden sm:inline">
            ({width} × {height}px)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {interactiveComponent && (
            <div className="flex items-center rounded-lg p-0.5 bg-[var(--tp-bg-surface)] border border-[var(--tp-border-subtle)]">
              <button
                type="button"
                onClick={() => setViewMode('image')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  viewMode === 'image'
                    ? 'bg-[var(--tp-brand-primary)] text-white'
                    : 'text-[var(--tp-text-secondary)] hover:text-[var(--tp-text-primary)]'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Image File</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  viewMode === 'interactive'
                    ? 'bg-[var(--tp-brand-primary)] text-white'
                    : 'text-[var(--tp-text-secondary)] hover:text-[var(--tp-text-primary)]'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Interactive UI</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopyPath}
            title="Copy relative file path to clipboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-[var(--tp-bg-surface)] hover:bg-[var(--tp-bg-card-nested)] border border-[var(--tp-border-subtle)] text-[var(--tp-text-secondary)] hover:text-[var(--tp-text-primary)] transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Path</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative p-2 md:p-3 bg-[var(--tp-bg-surface)]">
        {viewMode === 'image' || !interactiveComponent ? (
          <div className="relative w-full rounded-lg overflow-hidden border border-[var(--tp-border-subtle)] shadow-sm bg-[var(--tp-bg-canvas)]">
            <Image
              src={imagePath}
              alt={alt}
              width={width}
              height={height}
              className="w-full h-auto object-contain block transition-transform duration-300 group-hover:scale-[1.005]"
              priority={false}
              unoptimized
            />
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-[var(--tp-border-subtle)] bg-[var(--tp-bg-canvas)] p-4">
            {interactiveComponent}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="tp-placeholder-meta">
        <span className="truncate max-w-md text-[11px] text-[var(--tp-text-secondary)]">
          {description}
        </span>
        <span className="text-[10px] font-mono text-[var(--tp-brand-primary)] font-semibold shrink-0">
          Target: public{imagePath}
        </span>
      </div>
    </div>
  );
}
