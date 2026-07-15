import "server-only";
import { classifySymbol, sourced } from "@/data/provider";
import { serverEnv } from "@/data/env";
import type {
  DateRange,
  EarningsEvent,
  Fundamentals,
  NewsItem,
  NewsQuery,
  Quote,
  SearchResult,
  Sourced,
} from "@/data/types";

/**
 * Finnhub adapter — equities quotes, company news, fundamentals, earnings, and
 * symbol search on the free tier. Note: Finnhub's OHLCV candles moved to a paid
 * plan, so charting is NOT sourced here (see TwelveData / CoinGecko).
 */
const PROVIDER = "Finnhub";
const BASE = "https://finnhub.io/api/v1";

function url(path: string, params: Record<string, string>): string {
  const q = new URLSearchParams({ ...params, token: serverEnv.finnhub });
  return `${BASE}${path}?${q.toString()}`;
}

async function getJson(u: string): Promise<unknown> {
  const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json();
}

interface FinnhubQuote {
  c: number; d: number; dp: number; h: number; l: number; o: number; pc: number;
}

export const finnhubAdapter = {
  async getQuote(symbol: string): Promise<Sourced<Quote>> {
    const q = (await getJson(url("/quote", { symbol }))) as FinnhubQuote;
    if (!q || q.c === 0) throw new Error("Finnhub: no quote");
    return sourced(
      {
        symbol,
        price: q.c,
        change: q.d,
        changePercent: q.dp,
        open: q.o,
        high: q.h,
        low: q.l,
        previousClose: q.pc,
        currency: "USD",
      },
      "live",
      PROVIDER,
    );
  },

  async getNews(query: NewsQuery): Promise<Sourced<NewsItem[]>> {
    // Company news requires a symbol + date window; general news otherwise.
    const items: NewsItem[] = [];
    if (query.symbol) {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
      const raw = (await getJson(url("/company-news", { symbol: query.symbol, from, to }))) as Array<{
        id: number; headline: string; source: string; url: string; datetime: number; category: string; summary: string;
      }>;
      for (const n of raw.slice(0, query.limit ?? 12)) {
        items.push({
          id: String(n.id),
          headline: n.headline,
          source: n.source,
          url: n.url,
          publishedAt: n.datetime * 1000,
          category: n.category,
          tickers: [query.symbol],
          summary: n.summary,
        });
      }
    } else {
      const raw = (await getJson(url("/news", { category: query.category ?? "general" }))) as Array<{
        id: number; headline: string; source: string; url: string; datetime: number; category: string; summary: string;
      }>;
      for (const n of raw.slice(0, query.limit ?? 12)) {
        items.push({
          id: String(n.id),
          headline: n.headline,
          source: n.source,
          url: n.url,
          publishedAt: n.datetime * 1000,
          category: n.category,
          summary: n.summary,
        });
      }
    }
    return sourced(items, "live", PROVIDER);
  },

  async getFundamentals(symbol: string): Promise<Sourced<Fundamentals>> {
    const profile = (await getJson(url("/stock/profile2", { symbol }))) as {
      name?: string; marketCapitalization?: number; finnhubIndustry?: string; weburl?: string;
    };
    const metrics = (await getJson(url("/stock/metric", { symbol, metric: "all" }))) as {
      metric?: Record<string, number>;
    };
    const m = metrics.metric ?? {};
    return sourced(
      {
        symbol,
        name: profile.name,
        marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1e6 : undefined,
        peRatio: m["peNormalizedAnnual"],
        eps: m["epsNormalizedAnnual"],
        dividendYield: m["dividendYieldIndicatedAnnual"],
        beta: m["beta"],
        high52: m["52WeekHigh"],
        low52: m["52WeekLow"],
        industry: profile.finnhubIndustry,
      },
      "live",
      PROVIDER,
    );
  },

  async getEarningsCalendar(range: DateRange): Promise<Sourced<EarningsEvent[]>> {
    const raw = (await getJson(url("/calendar/earnings", { from: range.from, to: range.to }))) as {
      earningsCalendar?: Array<{ symbol: string; date: string; epsEstimate: number | null; epsActual: number | null; hour: string }>;
    };
    const events: EarningsEvent[] = (raw.earningsCalendar ?? []).map((e) => ({
      symbol: e.symbol,
      date: e.date,
      epsEstimate: e.epsEstimate ?? undefined,
      epsActual: e.epsActual ?? undefined,
      time: e.hour === "bmo" ? "bmo" : e.hour === "amc" ? "amc" : "dmh",
    }));
    return sourced(events, "live", PROVIDER);
  },

  async search(query: string): Promise<Sourced<SearchResult[]>> {
    const raw = (await getJson(url("/search", { q: query }))) as {
      result?: Array<{ symbol: string; description: string }>;
    };
    const results: SearchResult[] = (raw.result ?? []).slice(0, 12).map((r) => ({
      symbol: r.symbol,
      description: r.description,
      assetClass: classifySymbol(r.symbol),
    }));
    return sourced(results, "live", PROVIDER);
  },
};
