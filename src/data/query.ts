import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query configuration tuned for rate-limited free APIs: generous stale
 * times so we don't re-hit vendors needlessly, and capped exponential backoff
 * so a 429 doesn't hammer the endpoint.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount) => failureCount < 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      },
    },
  });
}

/** Per-data-kind stale times. Slower-moving data is cached far longer. */
export const staleTimes = {
  quote: 30_000,
  ohlcv: 5 * 60_000,
  orderbook: 10_000,
  news: 60_000,
  fundamentals: 60 * 60_000,
  estimates: 6 * 60 * 60_000,
  ownership: 6 * 60 * 60_000,
  econ: 24 * 60 * 60_000,
  earnings: 60 * 60_000,
  search: 5 * 60_000,
} as const;

/** Centralized query keys so caching and invalidation have one vocabulary. */
export const qk = {
  quote: (symbol?: string) => ["quote", symbol] as const,
  ohlcv: (symbol?: string, range?: string, interval?: string) =>
    ["ohlcv", symbol, range, interval] as const,
  orderbook: (symbol?: string) => ["orderbook", symbol] as const,
  news: (symbol?: string, category?: string) => ["news", symbol, category] as const,
  fundamentals: (symbol?: string) => ["fundamentals", symbol] as const,
  estimates: (symbol?: string) => ["estimates", symbol] as const,
  ownership: (symbol?: string) => ["ownership", symbol] as const,
  econ: (seriesId?: string) => ["econ", seriesId] as const,
  earnings: (from?: string, to?: string) => ["earnings", from, to] as const,
  econcal: (from?: string, to?: string) => ["econcal", from, to] as const,
  ipo: (from?: string, to?: string) => ["ipo", from, to] as const,
  search: (query?: string) => ["search", query] as const,
};
