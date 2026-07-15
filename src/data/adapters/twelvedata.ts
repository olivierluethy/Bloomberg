import "server-only";
import { sourced } from "@/data/provider";
import { serverEnv } from "@/data/env";
import type { Candle, Interval, Quote, Range, Sourced } from "@/data/types";

/**
 * Twelve Data adapter — OHLCV time series and quotes for non-crypto symbols on
 * the free tier (~8 req/min, 800/day). This is the primary charting source; the
 * tight rate limit is why TanStack Query uses long stale times upstream.
 */
const PROVIDER = "TwelveData";
const BASE = "https://api.twelvedata.com";

const INTERVAL_MAP: Record<Interval, string> = {
  "1min": "1min", "5min": "5min", "15min": "15min", "1h": "1h", "1day": "1day", "1week": "1week",
};
const RANGE_OUTPUT: Record<Range, number> = {
  "1D": 78, "5D": 200, "1M": 22, "3M": 66, "6M": 132, "1Y": 252, "5Y": 260,
};

function url(path: string, params: Record<string, string>): string {
  const q = new URLSearchParams({ ...params, apikey: serverEnv.twelveData });
  return `${BASE}${path}?${q.toString()}`;
}

async function getJson(u: string): Promise<Record<string, unknown>> {
  const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TwelveData ${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;
  if (body["status"] === "error") throw new Error(`TwelveData: ${String(body["message"])}`);
  return body;
}

export const twelveDataAdapter = {
  async getQuote(symbol: string): Promise<Sourced<Quote>> {
    const q = await getJson(url("/quote", { symbol }));
    const num = (k: string) => Number(q[k]);
    const price = num("close");
    if (!Number.isFinite(price)) throw new Error("TwelveData: no quote");
    return sourced(
      {
        symbol,
        price,
        change: num("change"),
        changePercent: num("percent_change"),
        open: num("open"),
        high: num("high"),
        low: num("low"),
        previousClose: num("previous_close"),
        volume: Number.isFinite(num("volume")) ? num("volume") : undefined,
        currency: typeof q["currency"] === "string" ? (q["currency"] as string) : "USD",
      },
      "live",
      PROVIDER,
    );
  },

  async getOHLCV(symbol: string, range: Range, interval: Interval): Promise<Sourced<Candle[]>> {
    const body = await getJson(
      url("/time_series", {
        symbol,
        interval: INTERVAL_MAP[interval],
        outputsize: String(RANGE_OUTPUT[range]),
        order: "ASC",
      }),
    );
    const values = body["values"];
    if (!Array.isArray(values)) throw new Error("TwelveData: no series");
    const candles: Candle[] = values.map((v) => {
      const row = v as Record<string, string>;
      return {
        time: Math.floor(new Date(row["datetime"] ?? "").getTime() / 1000),
        open: Number(row["open"]),
        high: Number(row["high"]),
        low: Number(row["low"]),
        close: Number(row["close"]),
        volume: Number(row["volume"] ?? 0),
      };
    });
    return sourced(candles, "live", PROVIDER);
  },
};
