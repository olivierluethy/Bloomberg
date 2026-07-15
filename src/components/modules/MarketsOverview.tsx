"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/components/primitives/Panel";
import { ResizablePanel } from "@/components/primitives/ResizablePanel";
import { DataCell } from "@/components/primitives/DataCell";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { formatPercent, formatPrice } from "@/lib/format";
import { panelVariants, staggerContainer } from "@/lib/motion";

/**
 * Markets overview — the default screen. In Phase 1 the numbers are static
 * placeholders (flagged SIMULATED in the status bar); the point is to prove the
 * shell, the resizable watchlist, panels, data cells, and skeletons all work
 * together before any data layer exists.
 */

interface Row {
  sym: string;
  last: number;
  chg: number;
}

const WATCHLIST: Row[] = [
  { sym: "AAPL", last: 229.87, chg: 0.62 },
  { sym: "MSFT", last: 467.12, chg: -0.34 },
  { sym: "NVDA", last: 126.45, chg: 2.18 },
  { sym: "AMZN", last: 201.34, chg: 0.91 },
  { sym: "TSLA", last: 248.9, chg: -1.42 },
  { sym: "GOOGL", last: 178.22, chg: 0.11 },
  { sym: "META", last: 512.7, chg: 1.36 },
  { sym: "BTC-USD", last: 63120.0, chg: 1.05 },
  { sym: "ETH-USD", last: 3421.5, chg: -0.78 },
  { sym: "EUR/USD", last: 1.0842, chg: -0.09 },
];

const MOVERS: Row[] = [
  { sym: "SMCI", last: 48.12, chg: 8.44 },
  { sym: "PLTR", last: 41.9, chg: 6.12 },
  { sym: "COIN", last: 214.55, chg: 4.87 },
  { sym: "MRNA", last: 28.31, chg: -5.63 },
  { sym: "INTC", last: 21.04, chg: -4.19 },
];

export function MarketsOverview() {
  const reduce = useReducedMotion();

  return (
    <div className="flex h-full gap-3 p-3">
      <ResizablePanel axis="x" defaultSize={288} min={220} max={460} className="h-full">
        <Panel
          title="Watchlist"
          eyebrow="Pinned"
          className="h-full"
          actions={<span className="eyebrow">{WATCHLIST.length}</span>}
          scroll
        >
          <QuoteList rows={WATCHLIST} />
        </Panel>
      </ResizablePanel>

      <motion.div
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="grid min-w-0 flex-1 grid-rows-[auto_1fr] gap-3"
      >
        <motion.div variants={reduce ? undefined : panelVariants}>
          <Panel title="Top Movers" eyebrow="Session">
            <QuoteList rows={MOVERS} />
          </Panel>
        </motion.div>

        <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0">
            <Panel title="Sector Heatmap" eyebrow="Loading" className="h-full min-h-48" scroll>
              <SkeletonRows rows={6} />
            </Panel>
          </motion.div>
          <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0">
            <Panel title="Latest Headlines" eyebrow="Loading" className="h-full min-h-48" scroll>
              <SkeletonRows rows={6} />
            </Panel>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function QuoteList({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((r) => {
          const dir = r.chg >= 0 ? "up" : "down";
          return (
            <tr
              key={r.sym}
              className="border-b border-line last:border-0 hover:bg-elevated"
            >
              <td className="px-3 py-1.5 font-mono text-sm font-medium text-fg">{r.sym}</td>
              <td className="py-1.5 text-right">
                <DataCell
                  value={r.last}
                  display={formatPrice(r.last, r.last < 10 ? 4 : 2)}
                  color="none"
                  className="text-fg"
                />
              </td>
              <td className="px-2 py-1.5 text-right">
                <DataCell value={r.chg} display={formatPercent(r.chg)} color={dir} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
