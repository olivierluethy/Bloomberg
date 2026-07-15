import "server-only";
import { sourced } from "@/data/provider";
import { serverEnv } from "@/data/env";
import type { NewsItem, NewsQuery, Sourced } from "@/data/types";

/**
 * NewsAPI.org adapter. Free dev tier is generous but localhost-only, so in a
 * deployed build this will 4xx and the router falls back to Finnhub or the mock
 * — all labeled. Company queries use /everything; the general feed uses
 * /top-headlines (business).
 */
const PROVIDER = "NewsAPI";
const BASE = "https://newsapi.org/v2";

interface Article {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string } | null;
}

export const newsApiAdapter = {
  async getNews(query: NewsQuery): Promise<Sourced<NewsItem[]>> {
    const limit = query.limit ?? 20;
    const endpoint = query.symbol ? "/everything" : "/top-headlines";
    const params: Record<string, string> = query.symbol
      ? { q: query.symbol, language: "en", sortBy: "publishedAt", pageSize: String(limit) }
      : { category: "business", language: "en", country: "us", pageSize: String(limit) };

    const res = await fetch(`${BASE}${endpoint}?${new URLSearchParams(params)}`, {
      headers: { "X-Api-Key": serverEnv.newsApi },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
    const body = (await res.json()) as { status: string; message?: string; articles?: Article[] };
    if (body.status !== "ok") throw new Error(`NewsAPI: ${body.message ?? "error"}`);

    const items: NewsItem[] = (body.articles ?? []).slice(0, limit).map((a, i) => ({
      id: a.url || String(i),
      headline: a.title,
      source: a.source?.name ?? PROVIDER,
      url: a.url,
      publishedAt: Date.parse(a.publishedAt) || Date.now(),
      category: query.category,
      tickers: query.symbol ? [query.symbol] : undefined,
      summary: a.description ?? undefined,
    }));
    return sourced(items, "live", PROVIDER);
  },
};
