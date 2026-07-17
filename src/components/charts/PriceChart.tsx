"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { SourceTag } from "@/components/primitives/SourceTag";
import { Skeleton } from "@/components/primitives/Skeleton";
import { useOHLCV } from "@/data/hooks";
import { formatPrice, priceDigits } from "@/lib/format";
import type { Interval, Range } from "@/data/types";
import { DEFAULT_INDICATORS, type CrosshairInfo, type IndicatorConfig } from "@/components/charts/types";

/**
 * The single charting component for the whole app — consumed by the asset
 * detail workspace (Phase 7) and any panel needing a price chart. Give it a
 * symbol; it owns range/interval, indicator toggles, data fetching, the legend,
 * and the crosshair readout. The heavy canvas is code-split (ssr:false).
 */

// Canvas is browser-only (canvas/DOM) and heavy → lazy load, no SSR.
const ChartCanvas = dynamic(() => import("@/components/charts/ChartCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-elevated" />,
});

const RANGES: Range[] = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];
const RANGE_INTERVAL: Record<Range, Interval> = {
  "1D": "5min",
  "5D": "15min",
  "1M": "1day",
  "3M": "1day",
  "6M": "1day",
  "1Y": "1day",
  "5Y": "1week",
};

const INDICATORS: { key: keyof IndicatorConfig; label: string }[] = [
  { key: "sma", label: "SMA" },
  { key: "ema", label: "EMA" },
  { key: "bollinger", label: "BB" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
];

export function PriceChart({
  symbol,
  initialRange = "3M",
  className,
}: {
  symbol: string;
  initialRange?: Range;
  className?: string;
}) {
  const [range, setRange] = useState<Range>(initialRange);
  const [config, setConfig] = useState<IndicatorConfig>(DEFAULT_INDICATORS);
  const [hover, setHover] = useState<CrosshairInfo | null>(null);

  const interval = RANGE_INTERVAL[range];
  const { data, isPending } = useOHLCV(symbol, range, interval);
  const candles = data?.data ?? [];

  // Stable references so the imperative canvas doesn't rebuild every render.
  const stableConfig = useMemo(() => config, [config]);
  const onCrosshair = useCallback((info: CrosshairInfo | null) => setHover(info), []);
  const toggle = (key: keyof IndicatorConfig) => setConfig((c) => ({ ...c, [key]: !c[key] }));

  const digits = priceDigits(symbol, candles.at(-1)?.close);
  const last = candles.at(-1);
  const shown = hover ?? (last ? { open: last.open, high: last.high, low: last.low, close: last.close } : null);
  const barUp = shown ? shown.close >= shown.open : true;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-1.5 py-0.5">
        <div className="flex items-center gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "px-1.5 py-0.5 font-mono text-2xs font-semibold transition-colors",
                r === range ? "bg-amber text-black" : "text-amber hover:bg-amber hover:text-black",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          {INDICATORS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={config[key]}
              className={cn(
                "border px-1.5 py-0.5 font-mono text-2xs font-semibold transition-colors",
                config[key] ? "border-amber bg-amber text-black" : "border-line text-amber hover:bg-amber hover:text-black",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SourceTag source={data?.source} provider={data?.provider} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 px-1.5 py-1 font-mono text-2xs tabular-nums">
        <span className="font-bold text-amber2">{symbol}</span>
        {shown ? (
          <span className={cn("flex gap-2", barUp ? "text-up" : "text-down")}>
            <Ohlc label="O" value={formatPrice(shown.open, digits)} />
            <Ohlc label="H" value={formatPrice(shown.high, digits)} />
            <Ohlc label="L" value={formatPrice(shown.low, digits)} />
            <Ohlc label="C" value={formatPrice(shown.close, digits)} />
          </span>
        ) : (
          <span className="text-fg-dim">—</span>
        )}
      </div>

      {/* Chart */}
      <div className="relative min-h-0 flex-1">
        {isPending ? (
          <div className="absolute inset-0 p-1">
            <Skeleton className="h-full w-full" />
          </div>
        ) : candles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-fg-dim">
            No price history available.
          </div>
        ) : (
          <ChartCanvas candles={candles} config={stableConfig} onCrosshair={onCrosshair} />
        )}
      </div>
    </div>
  );
}

function Ohlc({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-fg-dim">{label}</span> {value}
    </span>
  );
}
