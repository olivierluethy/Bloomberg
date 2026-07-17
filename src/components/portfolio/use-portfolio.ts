"use client";

import { useMemo } from "react";
import { useQuotes } from "@/data/hooks";
import {
  buildPositions,
  portfolioTotals,
  valuePositions,
  type MarketInput,
  type PortfolioTotals,
  type ValuedPosition,
} from "@/lib/portfolio";
import { usePortfolioHydration, usePortfolioStore } from "@/store/portfolio";

/**
 * Binds the persisted ledger to live quotes: replay the transactions into
 * positions, then value them.
 *
 * The whole module reads from this one hook, so the summary tiles, the holdings
 * table, and both charts are guaranteed to be describing the same numbers —
 * they can't disagree because they can't compute independently.
 */
export interface PortfolioValuation {
  hydrated: boolean;
  valued: ValuedPosition[];
  totals: PortfolioTotals;
  /** True while any holding's quote is still in flight. */
  isPending: boolean;
  symbols: string[];
}

export function usePortfolioValuation(): PortfolioValuation {
  const hydrated = usePortfolioHydration();
  const transactions = usePortfolioStore((s) => s.transactions);

  // Before rehydration the ledger is the seed, which would render one portfolio
  // and then replace it. Hold everything back until storage has spoken.
  const positions = useMemo(
    () => (hydrated ? buildPositions(transactions) : []),
    [hydrated, transactions],
  );

  const symbols = useMemo(() => positions.filter((p) => p.quantity > 0).map((p) => p.symbol), [positions]);
  const results = useQuotes(symbols);

  // Derived straight through rather than memoized: useQueries hands back a fresh
  // array every render, so any dep list keyed on it would miss every time. The
  // work is a few arithmetic passes over a handful of positions — memoizing it
  // would cost more than it saves.
  const quotes: Record<string, MarketInput | undefined> = {};
  symbols.forEach((symbol, i) => {
    const quote = results[i]?.data?.data;
    quotes[symbol] = quote ? { price: quote.price, change: quote.change } : undefined;
  });

  const valued = valuePositions(positions, quotes);
  const totals = portfolioTotals(valued);

  return {
    hydrated,
    valued,
    totals,
    isPending: results.some((r) => r.isPending),
    symbols,
  };
}
