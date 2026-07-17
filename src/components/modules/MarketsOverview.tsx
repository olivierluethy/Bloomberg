"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/components/primitives/Panel";
import { ResizablePanel } from "@/components/primitives/ResizablePanel";
import { DataCell } from "@/components/primitives/DataCell";
import { SourceTag } from "@/components/primitives/SourceTag";
import { Skeleton } from "@/components/primitives/Skeleton";
import { AssetTable } from "@/components/modules/AssetTable";
import { WatchlistPanel } from "@/components/watchlists/WatchlistPanel";
import { useQuotes } from "@/data/hooks";
import { MARKETS_MOVERS, MARKETS_SUMMARY } from "@/config/universes";
import { classifySymbol } from "@/data/provider";
import { formatPercent, formatPrice } from "@/lib/format";
import { panelVariants, staggerContainer } from "@/lib/motion";
import type { Provenance, Quote } from "@/data/types";

/**
 * Markets overview — the cross-asset home screen. Live/mocked quotes drive a
 * resizable watchlist, a summary strip, and ranked gainers/losers. Everything
 * reuses AssetTable and the Phase 2 hooks; nothing here is hard-coded data.
 */
export function MarketsOverview() {
  const reduce = useReducedMotion();

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <SummaryStrip />

      <div className="flex min-h-0 flex-1 gap-3">
        {/* id → the drag survives a reload (see store/layout). */}
        <ResizablePanel id="markets.watchlist" axis="x" defaultSize={320} min={240} max={520} className="h-full">
          <WatchlistPanel />
        </ResizablePanel>

        <motion.div
          variants={reduce ? undefined : staggerContainer}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "visible"}
          className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2"
        >
          <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0">
            <Panel title="Top Gainers" eyebrow="Session" className="h-full min-h-48" scroll>
              <AssetTable symbols={MARKETS_MOVERS} showVolume={false} limit={8} defaultSort={{ key: "changePercent", dir: "desc" }} />
            </Panel>
          </motion.div>
          <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0">
            <Panel title="Top Losers" eyebrow="Session" className="h-full min-h-48" scroll>
              <AssetTable symbols={MARKETS_MOVERS} showVolume={false} limit={8} defaultSort={{ key: "changePercent", dir: "asc" }} />
            </Panel>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/** Row of compact cross-asset quote chips. */
function SummaryStrip() {
  const results = useQuotes(MARKETS_SUMMARY);
  return (
    <div className="flex shrink-0 items-stretch gap-2 overflow-x-auto">
      {MARKETS_SUMMARY.map((symbol, i) => {
        const r = results[i];
        return (
          <SummaryChip
            key={symbol}
            symbol={symbol}
            quote={r?.data?.data}
            source={r?.data?.source}
            provider={r?.data?.provider}
            pending={r?.isPending ?? true}
          />
        );
      })}
    </div>
  );
}

function SummaryChip({
  symbol,
  quote,
  source,
  provider,
  pending,
}: {
  symbol: string;
  quote?: Quote;
  source?: Provenance;
  provider?: string;
  pending: boolean;
}) {
  const digits = classifySymbol(symbol) === "forex" ? 4 : 2;
  const dir = quote && quote.changePercent >= 0 ? "up" : "down";
  return (
    <div className="flex min-w-36 flex-col gap-1 border border-line bg-panel px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-2xs font-medium text-fg-dim">{symbol}</span>
        <SourceTag source={source} provider={provider} />
      </div>
      {pending || !quote ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <div className="flex items-baseline gap-2">
          <DataCell value={quote.price} display={formatPrice(quote.price, digits)} color="none" className="px-0 text-sm font-semibold text-fg" />
          <DataCell value={quote.changePercent} display={formatPercent(quote.changePercent)} color={dir} className="px-0 text-xs" />
        </div>
      )}
    </div>
  );
}
