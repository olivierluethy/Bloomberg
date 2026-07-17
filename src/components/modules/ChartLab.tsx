"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/primitives/Panel";
import { PriceChart } from "@/components/charts/PriceChart";

/**
 * Phase 4 verification screen for the charting engine. Swap symbols (BTC-USD is
 * live via CoinGecko; the rest are labeled mock without keys) and toggle
 * indicators to exercise <PriceChart/> before it's embedded in Phase 7.
 */
const SYMBOLS = ["BTC-USD", "ETH-USD", "AAPL", "MSFT", "EUR/USD", "GC=F"];

export function ChartLab() {
  const [symbol, setSymbol] = useState("BTC-USD");

  return (
    <div className="flex h-full flex-col p-1">
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">CHT</span>
        <h1 className="text-xs font-bold uppercase text-amber2">Charting Engine</h1>
        <span className="text-2xs text-fg-dim">One reusable PriceChart — candles, volume, indicators.</span>
        <div className="ml-auto flex items-center gap-1">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSymbol(s)}
              className={cn(
                "px-1.5 py-0.5 font-mono text-2xs font-semibold transition-colors",
                s === symbol ? "bg-amber/15 text-amber" : "text-fg-faint hover:text-fg-dim",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Panel tag="CHT" title={symbol} eyebrow="Price · OHLCV" className="min-h-0 flex-1" bodyClassName="min-h-0">
        <PriceChart symbol={symbol} />
      </Panel>
    </div>
  );
}
