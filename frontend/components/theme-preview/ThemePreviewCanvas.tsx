'use client';

import React, { useState } from 'react';
import './theme-tokens.css';
import { ThemePreviewToolbar, PreviewThemeMode } from './ThemePreviewToolbar';
import { ThemePreviewLanding } from './ThemePreviewLanding';

export function ThemePreviewCanvas() {
  const [mode, setMode] = useState<PreviewThemeMode>('dark');

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Interactive Sticky Toolbar with Palette Swatches & Mode Switcher */}
      <ThemePreviewToolbar currentMode={mode} onModeChange={setMode} />

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {mode === 'light' && (
          <div className="w-full">
            <div className="bg-[#FAF6ED] text-[#4A3539] border-b border-[#E5D3AF] px-6 py-2 text-xs font-mono font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#790D16]" />
                LIGHT THEME PREVIEW — Soft Ivory (#F5EFE1) &amp; Primary Burgundy (#790D16)
              </span>
              <span className="text-[11px] text-[#7E6569]">Eye-Comfort Warm Ivory Foundation</span>
            </div>
            <ThemePreviewLanding theme="light" />
          </div>
        )}

        {mode === 'dark' && (
          <div className="w-full">
            <div className="bg-[#403034] text-[#F5EFE1] border-b border-[#62464A] px-6 py-2 text-xs font-mono font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E5D3AF]" />
                DARK THEME PREVIEW — Warm Charcoal (#302326) &amp; Low-Glare Surfaces (#403034)
              </span>
              <span className="text-[11px] text-[#D4C3BB]">Non-Black Eye-Comfort Warm Palette</span>
            </div>
            <ThemePreviewLanding theme="dark" />
          </div>
        )}

        {mode === 'split' && (
          <div className="w-full">
            {/* Split Header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 bg-stone-900 border-b border-stone-800 text-xs font-mono font-bold px-4 py-2">
              <div className="flex items-center justify-between px-2 text-amber-200">
                <span>☀️ LIGHT THEME (#F5EFE1 / #790D16)</span>
                <span className="text-[10px] text-stone-400">Warm Ivory Surface</span>
              </div>
              <div className="flex items-center justify-between px-2 text-amber-100 pt-2 lg:pt-0">
                <span>🌙 DARK THEME (#302326 / #403034)</span>
                <span className="text-[10px] text-stone-400">Warm Charcoal Low-Glare</span>
              </div>
            </div>

            {/* Side-by-side content columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-800">
              <div className="overflow-x-hidden">
                <ThemePreviewLanding theme="light" />
              </div>
              <div className="overflow-x-hidden">
                <ThemePreviewLanding theme="dark" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
