import type { MarketDataProvider } from "@/data/provider";
import type { Sourced } from "@/data/types";

/**
 * Client-side implementation of the SAME MarketDataProvider interface. It talks
 * only to our own /api/data routes, so browser code depends on the interface —
 * never on a real vendor SDK or an API key. This is what the TanStack Query
 * hooks call.
 */

type Param = string | number | undefined;

async function call<T>(method: string, params: Record<string, Param>): Promise<Sourced<T>> {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  const res = await fetch(`/api/data/${method}?${q.toString()}`);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`data/${method} failed (${res.status}): ${(detail as { error?: string }).error ?? ""}`);
  }
  return (await res.json()) as Sourced<T>;
}

export const apiClientProvider: MarketDataProvider = {
  getQuote: (symbol) => call("quote", { symbol }),
  getOHLCV: (symbol, range, interval) => call("ohlcv", { symbol, range, interval }),
  getOrderBook: (symbol, depth) => call("orderbook", { symbol, depth }),
  getNews: (query) => call("news", { symbol: query.symbol, category: query.category, limit: query.limit }),
  getFundamentals: (symbol) => call("fundamentals", { symbol }),
  getAnalystEstimates: (symbol) => call("estimates", { symbol }),
  getOwnership: (symbol) => call("ownership", { symbol }),
  getEconomicSeries: (seriesId) => call("econ", { seriesId }),
  getEarningsCalendar: (range) => call("earnings", { from: range.from, to: range.to }),
  search: (query) => call("search", { q: query }),
};
