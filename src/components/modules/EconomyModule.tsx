"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/components/primitives/Panel";
import { Skeleton } from "@/components/primitives/Skeleton";
import { SourceTag } from "@/components/primitives/SourceTag";
import { SeriesChart } from "@/components/economy/SeriesChart";
import { YieldCurve } from "@/components/economy/YieldCurve";
import { ECON_SERIES, formatEcon, formatEconDelta, type EconSeries } from "@/config/econ";
import { MODULES } from "@/config/modules";
import { useEconomicSeriesBatch } from "@/data/hooks";
import { cn } from "@/lib/cn";
import { panelVariants, staggerContainer } from "@/lib/motion";
import type { EconPoint, Provenance } from "@/data/types";

/**
 * The macro dashboard: FRED series (or labelled simulations) as small multiples,
 * plus the treasury curve.
 *
 * Small multiples rather than one chart with six lines: GDP in trillions and
 * unemployment in percent share no axis, and forcing them together would mean a
 * dual-axis chart — the one thing a reader can't reliably decode.
 */
export function EconomyModule() {
  const reduce = useReducedMotion();
  const mod = MODULES.find((m) => m.id === "economy");
  const results = useEconomicSeriesBatch(ECON_SERIES.map((s) => s.id));

  return (
    <div className="flex h-full flex-col gap-px overflow-auto p-px">
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">{mod?.code ?? "ECO"}</span>
        <h1 className="text-xs font-bold uppercase text-amber2">{mod?.label ?? "Economy"}</h1>
        <span className="hidden text-sm text-fg-faint sm:inline">{mod?.blurb}</span>
      </div>

      {/* Latest reading per series — a scalar plus its delta is a stat tile. */}
      <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {ECON_SERIES.map((series, i) => (
          <StatTile
            key={series.id}
            series={series}
            points={results[i]?.data?.data}
            source={results[i]?.data?.source}
            provider={results[i]?.data?.provider}
            pending={results[i]?.isPending ?? true}
          />
        ))}
      </div>

      <motion.div
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="grid min-h-0 flex-1 grid-cols-1 gap-px lg:grid-cols-3"
      >
        {ECON_SERIES.map((series, i) => (
          <motion.div key={series.id} variants={reduce ? undefined : panelVariants} className="min-h-0">
            <Panel
              tag={String(i + 1)}
              title={series.short}
              eyebrow={`${series.group} · ${series.frequency}`}
              className="h-full min-h-52"
              bodyClassName="p-1"
              actions={<SourceTag source={results[i]?.data?.source} provider={results[i]?.data?.provider} />}
            >
              {results[i]?.isPending ? (
                <Skeleton className="h-full min-h-40 w-full" />
              ) : (
                <div className="h-full min-h-40">
                  <SeriesChart series={series} points={results[i]?.data?.data ?? []} />
                </div>
              )}
            </Panel>
          </motion.div>
        ))}

        <motion.div variants={reduce ? undefined : panelVariants} className="min-h-0 lg:col-span-3">
          {/* Follows the series panels, which number 1..ECON_SERIES.length —
              derived, not hardcoded, or adding a series silently duplicates a
              panel number. */}
          <Panel
            tag={String(ECON_SERIES.length + 1)}
            title="Treasury Yield Curve"
            eyebrow="Rates · daily"
            className="h-full min-h-56"
          >
            <YieldCurve />
          </Panel>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatTile({
  series,
  points,
  source,
  provider,
  pending,
}: {
  series: EconSeries;
  points?: EconPoint[];
  source?: Provenance;
  provider?: string;
  pending: boolean;
}) {
  const last = points?.at(-1);
  const prev = points?.at(-2);
  const delta = last && prev ? last.value - prev.value : undefined;

  // For CPI and unemployment a rise is the bad direction, so the tone follows
  // the indicator's meaning rather than the sign.
  const good = delta === undefined || delta === 0 ? null : series.inverse ? delta < 0 : delta > 0;

  return (
    <div className="flex flex-col gap-0.5 border border-line bg-panel px-1.5 py-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow truncate">{series.short}</span>
        <SourceTag source={source} provider={provider} />
      </div>
      {pending || !last ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <>
          <span className="font-mono text-sm font-semibold tabular-nums text-fg">
            {formatEcon(last.value, series.units)}
          </span>
          <span
            className={cn(
              "font-mono text-2xs tabular-nums",
              good === null ? "text-fg-faint" : good ? "text-up" : "text-down",
            )}
          >
            {delta !== undefined ? `${formatEconDelta(delta, series.units)} vs prior` : "—"}
          </span>
        </>
      )}
    </div>
  );
}
