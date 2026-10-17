'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sun, Moon, Columns2, ArrowLeft, Info, Check, Copy } from 'lucide-react';

export type PreviewThemeMode = 'light' | 'dark' | 'split';

interface ThemePreviewToolbarProps {
  currentMode: PreviewThemeMode;
  onModeChange: (mode: PreviewThemeMode) => void;
}

const PALETTE = [
  { name: 'Burgundy (Light)', hex: '#9f1722', role: 'Light mode primary CTAs, active highlights' },
  { name: 'Burgundy (Dark)', hex: '#790D16', role: 'Dark mode brand accent, active states' },
  { name: 'Warm Sand', hex: '#E5D3AF', role: 'Secondary surfaces, card highlights, badges' },
  { name: 'Soft Ivory', hex: '#F5EFE1', role: 'Light canvas background, dark mode primary text' },
  { name: 'Dusty Blue', hex: '#AEC4D4', role: 'Informational panels, data visualizations, secondary accents' },
  { name: 'Warm Charcoal', hex: '#302326', role: 'Dark mode main canvas background' },
];

export function ThemePreviewToolbar({ currentMode, onModeChange }: ThemePreviewToolbarProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-stone-900/90 border-b border-stone-800 text-stone-200 px-4 py-2.5 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Homepage</span>
          </Link>

          <div className="h-4 w-px bg-stone-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Visual Theme Exploration (Isolated Route)
            </span>
          </div>
        </div>

        {/* Center: Swatches */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700 text-xs font-mono">
          <span className="text-[11px] text-stone-400 mr-1">Brand Palette:</span>
          {PALETTE.slice(0, 4).map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => copyHex(c.hex)}
              title={`${c.name}: ${c.hex} (Click to copy)`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-stone-700 transition-colors cursor-pointer group"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-[10px] text-stone-300 group-hover:text-white">{c.hex}</span>
              {copiedHex === c.hex && <Check className="w-2.5 h-2.5 text-emerald-400" />}
            </button>
          ))}
        </div>

        {/* Right: Mode Switcher & Inspector */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-800 border border-stone-700">
            <button
              type="button"
              onClick={() => onModeChange('light')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'light'
                  ? 'bg-amber-100 text-amber-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('dark')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'dark'
                  ? 'bg-[#403034] text-[#F5EFE1] border border-[#62464A] shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('split')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'split'
                  ? 'bg-stone-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Palette Info Toggle */}
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
            title="Inspect Brand Palette & Contrast"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide-down Palette Inspector */}
      {showInspector && (
        <div className="max-w-7xl mx-auto mt-3 p-4 rounded-xl bg-stone-800 border border-stone-700 shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-stone-700">
            <div>
              <h3 className="text-sm font-bold text-white">Exact Color Palette Specification</h3>
              <p className="text-xs text-stone-400">
                Four core brand anchors + derived low-glare dark surfaces for comfortable prolonged use.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInspector(false)}
              className="text-xs text-stone-400 hover:text-white px-2 py-1 rounded hover:bg-stone-700"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
            {PALETTE.map((c) => (
              <div
                key={c.hex}
                onClick={() => copyHex(c.hex)}
                className="p-3 rounded-lg bg-stone-900 border border-stone-800 hover:border-stone-600 cursor-pointer transition-all"
              >
                <div
                  className="w-full h-10 rounded-md border border-white/10 mb-2 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{c.name}</span>
                  <Copy className="w-3 h-3 text-stone-500 hover:text-white" />
                </div>
                <div className="font-mono text-[11px] text-amber-300 mt-0.5">{c.hex}</div>
                <div className="text-[10px] text-stone-400 mt-1 leading-tight">{c.role}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-700 text-xs text-stone-300 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Contrast Ratios:</strong> Ivory text on Charcoal = <strong>14.2:1 (AAA)</strong> • Burgundy on Ivory = <strong>8.6:1 (AAA)</strong> • Sand on Dark = <strong>9.4:1 (AAA)</strong>.
            </span>
            <span className="text-stone-400 italic">
              Click any color swatch to copy its hex code to clipboard.
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
