"use client";

import { useUIStore } from "@/store/ui";

/**
 * Bottom status strip: market state, latency, the keyboard hint, and the global
 * data-provenance indicator.
 *
 * The benchmark-index chips that used to sit here are gone — they were static
 * Phase 1 placeholder numbers, and the top ticker tape now carries the same
 * instruments from the real quotes hook. Nothing was lost but the hard-coding.
 */

/** Opens the keyboard reference — the map is worthless if it's a secret. */
function ShortcutsHint() {
  const openModal = useUIStore((s) => s.openModal);
  return (
    <button
      type="button"
      onClick={() => openModal("shortcuts")}
      title="Keyboard shortcuts"
      className="hidden shrink-0 items-center gap-1 text-amber transition-colors hover:text-amber2 sm:flex"
    >
      <kbd className="border border-line px-1 text-2xs">?</kbd>
      <span className="text-2xs uppercase">keys</span>
    </button>
  );
}

export function StatusBar() {
  return (
    <footer className="flex h-5 shrink-0 items-center gap-1.5 border-t border-line bg-void px-1.5 text-2xs">
      <span className="flex shrink-0 items-center gap-1">
        {/* Squared off by the global radius reset — the reference has no dots. */}
        <span className="h-1.5 w-1.5 bg-up" aria-hidden />
        <span className="font-bold text-amber2">MARKETS OPEN</span>
      </span>

      <span className="hidden shrink-0 items-center gap-1 text-fg-dim sm:flex">
        <span className="tabular-nums">42ms</span>
      </span>

      <div className="min-w-0 flex-1" />

      {/* The keyboard map is worthless if nobody knows it exists. */}
      <ShortcutsHint />

      {/*
        Global provenance indicator. Kept — it is genuinely useful and has no
        equivalent in the reference — but restyled to the terminal's badge
        chrome: solid fill, black text, square, dense.
      */}
      <span
        className="shrink-0 bg-amber px-1 font-bold text-black"
        title="Data source: simulated placeholder (no live feed wired yet)"
      >
        SIMULATED
      </span>
    </footer>
  );
}
