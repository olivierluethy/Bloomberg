"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/components/primitives/Panel";
import { ResizablePanel } from "@/components/primitives/ResizablePanel";
import { AssetTable } from "@/components/modules/AssetTable";
import { WatchlistPanel } from "@/components/watchlists/WatchlistPanel";
import { MARKETS_MOVERS } from "@/config/universes";
import { panelVariants, staggerContainer } from "@/lib/motion";

/**
 * Markets overview — the cross-asset home screen. Live/mocked quotes drive a
 * resizable watchlist and ranked gainers/losers. Everything reuses AssetTable
 * and the Phase 2 hooks; nothing here is hard-coded data.
 *
 * The MARKETS_SUMMARY card tiles that used to head this screen are gone: the
 * shell's ticker tape now shows that exact universe through the same `useQuotes`
 * hook, so keeping the tiles would have meant rendering the same seven
 * instruments twice on the same page.
 */
export function MarketsOverview() {
  const reduce = useReducedMotion();

  return (
    <div className="flex h-full flex-col gap-px p-px">
      <div className="flex min-h-0 flex-1 gap-px">
        {/* id → the drag survives a reload (see store/layout). */}
        <ResizablePanel id="markets.watchlist" axis="x" defaultSize={320} min={240} max={520} className="h-full">
          <WatchlistPanel />
        </ResizablePanel>

        <motion.div
          variants={reduce ? undefined : staggerContainer}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "visible"}
          className="grid min-w-0 flex-1 grid-cols-1 gap-px lg:grid-cols-2"
        >
          {/*
            min-w-0 is load-bearing: a grid item defaults to min-width:auto, so
            without it the widest table cell sets the column width and the second
            panel is pushed off-screen instead of the two sharing the row.
          */}
          <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0 min-w-0">
            <Panel tag="2" title="Top Gainers" eyebrow="Session" className="h-full min-h-48" scroll>
              <AssetTable symbols={MARKETS_MOVERS} showVolume={false} limit={8} defaultSort={{ key: "changePercent", dir: "desc" }} />
            </Panel>
          </motion.div>
          {/*
            min-w-0 is load-bearing: a grid item defaults to min-width:auto, so
            without it the widest table cell sets the column width and the second
            panel is pushed off-screen instead of the two sharing the row.
          */}
          <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0 min-w-0">
            <Panel tag="3" title="Top Losers" eyebrow="Session" className="h-full min-h-48" scroll>
              <AssetTable symbols={MARKETS_MOVERS} showVolume={false} limit={8} defaultSort={{ key: "changePercent", dir: "asc" }} />
            </Panel>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
