"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/components/primitives/Panel";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { AllocationChart } from "@/components/portfolio/AllocationChart";
import { ExposureChart } from "@/components/portfolio/ExposureChart";
import { TradeModal } from "@/components/portfolio/TradeModal";
import { usePortfolioValuation } from "@/components/portfolio/use-portfolio";
import { MODULES } from "@/config/modules";
import { panelVariants, staggerContainer } from "@/lib/motion";
import { useUIStore } from "@/store/ui";
import { usePortfolioStore } from "@/store/portfolio";

/**
 * The virtual portfolio.
 *
 * Every number on this screen comes from one valuation (see use-portfolio), so
 * the tiles, the table, and both charts cannot disagree. The instruments are
 * whatever the data layer provides — live or simulated — but the cost-basis and
 * P&L math is real either way.
 */
export function PortfolioModule() {
  const reduce = useReducedMotion();
  const mod = MODULES.find((m) => m.id === "portfolio");
  const { hydrated, valued, totals, isPending } = usePortfolioValuation();
  const openModal = useUIStore((s) => s.openModal);
  const reset = usePortfolioStore((s) => s.reset);

  // Until the ledger rehydrates there is nothing truthful to show.
  const pending = !hydrated || isPending;

  return (
    <div className="flex h-full flex-col gap-px p-px">
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">{mod?.code ?? "PORT"}</span>
        <h1 className="text-xs font-bold uppercase text-amber2">{mod?.label ?? "Portfolio"}</h1>
        <span className="hidden text-sm text-fg-faint sm:inline">Virtual holdings · FIFO cost basis</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => openModal("trade")}
            className="border border-amber/60 px-1.5 py-1 font-mono text-2xs font-semibold text-amber transition-colors hover:bg-amber/10"
          >
            TRADE
          </button>
          <button
            type="button"
            onClick={reset}
            title="Restore the sample ledger"
            className="border border-line px-1.5 py-1 font-mono text-2xs text-fg-dim transition-colors hover:border-line-bright hover:text-fg"
          >
            RESET
          </button>
        </div>
      </div>

      <PortfolioSummary totals={totals} pending={pending} />

      <motion.div
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="grid min-h-0 flex-1 grid-cols-1 gap-px lg:grid-cols-[1fr_340px]"
      >
        <motion.div variants={reduce ? undefined : panelVariants} className="flex min-h-0 flex-col">
          <Panel
            tag="1"
            title="Holdings"
            eyebrow="Positions"
            className="min-h-0 flex-1"
            actions={<span className="eyebrow">{valued.length} positions</span>}
            scroll
          >
            <HoldingsTable valued={valued} pending={pending} />
          </Panel>
        </motion.div>

        <motion.div variants={reduce ? undefined : panelVariants} className="flex min-h-0 flex-col gap-px">
          <Panel tag="2" title="Allocation" eyebrow="By asset class" className="shrink-0">
            <AllocationChart valued={valued} pending={pending} />
          </Panel>
          <Panel tag="3" title="Exposure" eyebrow="Equity sector · other classes grouped" className="min-h-0 flex-1" scroll>
            {pending ? null : <ExposureChart valued={valued} />}
          </Panel>
        </motion.div>
      </motion.div>

      <TradeModal />
    </div>
  );
}
