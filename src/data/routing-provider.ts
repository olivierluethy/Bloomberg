import "server-only";
import { classifySymbol } from "@/data/provider";
import type { MarketDataProvider } from "@/data/provider";
import type { Sourced } from "@/data/types";
import { available } from "@/data/env";
import { mockProvider } from "@/data/adapters/mock";
import { coinGeckoAdapter } from "@/data/adapters/coingecko";
import { finnhubAdapter } from "@/data/adapters/finnhub";
import { twelveDataAdapter } from "@/data/adapters/twelvedata";
import { fredAdapter } from "@/data/adapters/fred";
import { newsApiAdapter } from "@/data/adapters/newsapi";

/**
 * The server-side implementation of MarketDataProvider. It routes each call to
 * the right real adapter by asset class, and on any error / missing key /
 * rate-limit it falls back to the mock source. The fallback is quiet to the
 * user but never hidden: the returned `source` becomes "simulated", which the
 * dev provenance indicator surfaces.
 */

type Attempt<T> = () => Promise<Sourced<T>>;

async function firstOk<T>(attempts: Attempt<T>[], fallback: Attempt<T>): Promise<Sourced<T>> {
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (err) {
      // Labeled, quiet degradation — logged server-side, invisible to the user
      // beyond the value's provenance flipping to "simulated".
      console.warn(`[data] live source failed, trying next/fallback: ${(err as Error).message}`);
    }
  }
  return fallback();
}

export const routingProvider: MarketDataProvider = {
  getQuote(symbol) {
    const cls = classifySymbol(symbol);
    const attempts: Attempt<Awaited<ReturnType<MarketDataProvider["getQuote"]>>["data"]>[] = [];
    if (cls === "crypto") {
      attempts.push(() => coinGeckoAdapter.getQuote(symbol));
    } else {
      if (available.finnhub) attempts.push(() => finnhubAdapter.getQuote(symbol));
      if (available.twelveData) attempts.push(() => twelveDataAdapter.getQuote(symbol));
    }
    return firstOk(attempts, () => mockProvider.getQuote(symbol));
  },

  getOHLCV(symbol, range, interval) {
    const cls = classifySymbol(symbol);
    const attempts: Attempt<Awaited<ReturnType<MarketDataProvider["getOHLCV"]>>["data"]>[] = [];
    if (cls === "crypto") {
      attempts.push(() => coinGeckoAdapter.getOHLCV(symbol, range));
    } else if (available.twelveData) {
      attempts.push(() => twelveDataAdapter.getOHLCV(symbol, range, interval));
    }
    return firstOk(attempts, () => mockProvider.getOHLCV(symbol, range, interval));
  },

  getOrderBook(symbol, depth) {
    // No viable free real source — always simulated.
    return mockProvider.getOrderBook(symbol, depth);
  },

  getNews(query) {
    const attempts: Attempt<Awaited<ReturnType<MarketDataProvider["getNews"]>>["data"]>[] = [];
    if (available.newsApi) attempts.push(() => newsApiAdapter.getNews(query));
    if (available.finnhub) attempts.push(() => finnhubAdapter.getNews(query));
    return firstOk(attempts, () => mockProvider.getNews(query));
  },

  getFundamentals(symbol) {
    const attempts = available.finnhub ? [() => finnhubAdapter.getFundamentals(symbol)] : [];
    return firstOk(attempts, () => mockProvider.getFundamentals(symbol));
  },

  getAnalystEstimates(symbol) {
    return mockProvider.getAnalystEstimates(symbol);
  },

  getOwnership(symbol) {
    return mockProvider.getOwnership(symbol);
  },

  getEconomicSeries(seriesId) {
    const attempts = available.fred ? [() => fredAdapter.getEconomicSeries(seriesId)] : [];
    return firstOk(attempts, () => mockProvider.getEconomicSeries(seriesId));
  },

  getEarningsCalendar(range) {
    const attempts = available.finnhub ? [() => finnhubAdapter.getEarningsCalendar(range)] : [];
    return firstOk(attempts, () => mockProvider.getEarningsCalendar(range));
  },

  // No free source publishes a macro release calendar, and the free IPO
  // calendars went premium — these are mock-only by design, not by omission.
  getEconomicCalendar(range) {
    return mockProvider.getEconomicCalendar(range);
  },

  getIpoCalendar(range) {
    return mockProvider.getIpoCalendar(range);
  },

  search(query) {
    const attempts = available.finnhub ? [() => finnhubAdapter.search(query)] : [];
    return firstOk(attempts, () => mockProvider.search(query));
  },
};
