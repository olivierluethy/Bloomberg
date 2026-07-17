"use client";

import { DataCell } from "@/components/primitives/DataCell";
import { formatPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/store/ui";

/**
 * Bottom status bar. Shows market state, a strip of benchmark indices, and —
 * importantly — the global data-provenance indicator. Everything here is static
 * placeholder content in Phase 1; real values arrive with the Phase 2 data layer.
 */

/** Opens the keyboard reference — the map is worthless if it's a secret. */
function ShortcutsHint() {
  const openModal = useUIStore((s) => s.openModal);
  return (
    <button
      type="button"
      onClick={() => openModal("shortcuts")}
      title="Keyboard shortcuts"
      className="hidden shrink-0 items-center gap-1.5 text-fg-faint transition-colors hover:text-fg-dim sm:flex"
    >
      <kbd className="border border-line px-1 py-px font-mono text-2xs">?</kbd>
      <span className="text-2xs">keys</span>
    </button>
  );
}

interface IndexChip {
  label: string;
  value: number;
  changePct: number;
}

const PLACEHOLDER_INDICES: IndexChip[] = [
  { label: "S&P 500", value: 5487.03, changePct: 0.42 },
  { label: "NDX", value: 19764.12, changePct: 0.81 },
  { label: "DJIA", value: 39210.55, changePct: -0.16 },
  { label: "VIX", value: 13.24, changePct: -2.35 },
];

export function StatusBar() {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-elevated px-3 text-xs">
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden />
        <span className="font-medium text-fg-dim">MARKETS OPEN</span>
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
        {PLACEHOLDER_INDICES.map((idx) => {
          const dir = idx.changePct >= 0 ? "up" : "down";
          return (
            <span key={idx.label} className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-fg-faint">{idx.label}</span>
              <DataCell
                value={idx.value}
                display={formatPrice(idx.value)}
                color="none"
                className="px-0 text-fg"
              />
              <DataCell
                value={idx.changePct}
                display={formatPercent(idx.changePct)}
                color={dir}
                className="px-0"
              />
            </span>
          );
        })}
      </div>

      <span className="hidden shrink-0 items-center gap-1.5 font-mono text-fg-faint sm:flex">
        <span aria-hidden>◇</span>
        <span className="tabular-nums">42ms</span>
      </span>

      {/* The keyboard map is worthless if nobody knows it exists. */}
      <ShortcutsHint />

      {/* Dev-only provenance indicator — replaced by per-datum tags in Phase 2 */}
      <span
        className={cn(
          "shrink-0 border border-amber/40 px-1.5 py-0.5 font-mono text-2xs font-semibold tracking-wide",
          "text-amber",
        )}
        title="Data source: simulated placeholder (no live feed wired yet)"
      >
        SIMULATED
      </span>
    </footer>
  );
}
