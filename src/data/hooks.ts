import { useQuery } from "@tanstack/react-query";
import { apiClientProvider as api } from "@/data/api-client";
import { qk, staleTimes } from "@/data/query";
import type { DateRange, Interval, NewsQuery, Range } from "@/data/types";

/**
 * The public data hooks. Every component reads market data through these — the
 * only sanctioned entry point. Swapping a source happens behind the provider;
 * these signatures never change.
 */

export function useQuote(symbol?: string) {
  return useQuery({
    queryKey: qk.quote(symbol),
    queryFn: () => api.getQuote(symbol as string),
    enabled: Boolean(symbol),
    staleTime: staleTimes.quote,
  });
}

export function useOHLCV(symbol?: string, range: Range = "1M", interval: Interval = "1day") {
  return useQuery({
    queryKey: qk.ohlcv(symbol, range, interval),
    queryFn: () => api.getOHLCV(symbol as string, range, interval),
    enabled: Boolean(symbol),
    staleTime: staleTimes.ohlcv,
  });
}

export function useOrderBook(symbol?: string, depth = 12) {
  return useQuery({
    queryKey: qk.orderbook(symbol),
    queryFn: () => api.getOrderBook(symbol as string, depth),
    enabled: Boolean(symbol),
    staleTime: staleTimes.orderbook,
  });
}

export function useNews(query: NewsQuery = {}) {
  return useQuery({
    queryKey: qk.news(query.symbol, query.category),
    queryFn: () => api.getNews(query),
    staleTime: staleTimes.news,
  });
}

export function useFundamentals(symbol?: string) {
  return useQuery({
    queryKey: qk.fundamentals(symbol),
    queryFn: () => api.getFundamentals(symbol as string),
    enabled: Boolean(symbol),
    staleTime: staleTimes.fundamentals,
  });
}

export function useAnalystEstimates(symbol?: string) {
  return useQuery({
    queryKey: qk.estimates(symbol),
    queryFn: () => api.getAnalystEstimates(symbol as string),
    enabled: Boolean(symbol),
    staleTime: staleTimes.estimates,
  });
}

export function useOwnership(symbol?: string) {
  return useQuery({
    queryKey: qk.ownership(symbol),
    queryFn: () => api.getOwnership(symbol as string),
    enabled: Boolean(symbol),
    staleTime: staleTimes.ownership,
  });
}

export function useEconomicSeries(seriesId?: string) {
  return useQuery({
    queryKey: qk.econ(seriesId),
    queryFn: () => api.getEconomicSeries(seriesId as string),
    enabled: Boolean(seriesId),
    staleTime: staleTimes.econ,
  });
}

export function useEarningsCalendar(range: DateRange) {
  return useQuery({
    queryKey: qk.earnings(range.from, range.to),
    queryFn: () => api.getEarningsCalendar(range),
    enabled: Boolean(range.from && range.to),
    staleTime: staleTimes.earnings,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: qk.search(query),
    queryFn: () => api.search(query),
    enabled: query.trim().length > 0,
    staleTime: staleTimes.search,
  });
}
