"use client";

import { Panel } from "@/components/primitives/Panel";
import { AssetTable } from "@/components/modules/AssetTable";
import { useQuotes } from "@/data/hooks";
import { MODULES } from "@/config/modules";
import { UNIVERSES } from "@/config/universes";

/**
 * Generic asset-class screen. Every asset route renders this with its module id;
 * it reads the symbol universe from config and reuses AssetTable, so the eight
 * panels share one implementation. Rendered from a lazy route, so it code-splits.
 */
export function AssetClassPanel({ moduleId }: { moduleId: string }) {
  const mod = MODULES.find((m) => m.id === moduleId);
  const universe = UNIVERSES[moduleId];

  if (!universe) {
    return <div className="p-3 text-sm text-down">No universe configured for “{moduleId}”.</div>;
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">{mod?.code ?? "—"}</span>
        <h1 className="text-base font-semibold text-fg">{mod?.label ?? moduleId}</h1>
        <span className="text-sm text-fg-faint">{mod?.blurb}</span>
        <Breadth symbols={universe.symbols} />
      </div>

      <Panel
        title={`${mod?.label ?? moduleId} — Screen`}
        eyebrow="Live · Sortable"
        className="min-h-0 flex-1"
        actions={<span className="eyebrow">{universe.symbols.length} symbols</span>}
        scroll
      >
        <AssetTable symbols={universe.symbols} showVolume={universe.showVolume} pinnable />
      </Panel>
    </div>
  );
}

/** Advancers / decliners / average change — computed from the (cached) quotes. */
function Breadth({ symbols }: { symbols: string[] }) {
  const results = useQuotes(symbols);
  const quotes = results.map((r) => r.data?.data).filter(Boolean);
  if (quotes.length === 0) return <span className="ml-auto eyebrow">Loading…</span>;

  const advancers = quotes.filter((q) => q!.changePercent > 0).length;
  const decliners = quotes.filter((q) => q!.changePercent < 0).length;
  const avg = quotes.reduce((s, q) => s + q!.changePercent, 0) / quotes.length;

  return (
    <div className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums">
      <span className="text-up">▲ {advancers}</span>
      <span className="text-down">▼ {decliners}</span>
      <span className={avg >= 0 ? "text-up" : "text-down"}>
        avg {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
      </span>
    </div>
  );
}
