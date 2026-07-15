import "server-only";
import { sourced } from "@/data/provider";
import { serverEnv } from "@/data/env";
import type { Candle, Quote, Range, Sourced } from "@/data/types";

/**
 * CoinGecko adapter — live crypto data on the keyless public tier. This is our
 * proof that a real source flows through the same interface as the mock.
 */
const PROVIDER = "CoinGecko";
const BASE = "https://api.coingecko.com/api/v3";

/** Minimal symbol → CoinGecko id map. Unknown symbols throw → mock fallback. */
const IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", ADA: "cardano",
  DOGE: "dogecoin", AVAX: "avalanche-2", DOT: "polkadot", LINK: "chainlink",
  MATIC: "matic-network", LTC: "litecoin", BCH: "bitcoin-cash", UNI: "uniswap",
  ATOM: "cosmos", XLM: "stellar",
};

function coinId(symbol: string): string {
  const base = symbol.toUpperCase().replace(/-USD$|-USDT$/i, "");
  const id = IDS[base];
  if (!id) throw new Error(`CoinGecko: unknown symbol ${symbol}`);
  return id;
}

function headers(): HeadersInit {
  return serverEnv.coinGecko
    ? { accept: "application/json", "x-cg-demo-api-key": serverEnv.coinGecko }
    : { accept: "application/json" };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

const RANGE_DAYS: Record<Range, number> = {
  "1D": 1, "5D": 5, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1825,
};

interface MarketRow {
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
}

export const coinGeckoAdapter = {
  async getQuote(symbol: string): Promise<Sourced<Quote>> {
    const id = coinId(symbol);
    const rows = (await getJson(
      `${BASE}/coins/markets?vs_currency=usd&ids=${id}&price_change_percentage=24h`,
    )) as MarketRow[];
    const row = rows[0];
    if (!row) throw new Error("CoinGecko: empty response");
    const price = row.current_price;
    const change = row.price_change_24h;
    return sourced(
      {
        symbol,
        price,
        change,
        changePercent: row.price_change_percentage_24h,
        open: price - change,
        high: row.high_24h,
        low: row.low_24h,
        previousClose: price - change,
        volume: row.total_volume,
        currency: "USD",
      },
      "live",
      PROVIDER,
    );
  },

  async getOHLCV(symbol: string, range: Range): Promise<Sourced<Candle[]>> {
    const id = coinId(symbol);
    const days = RANGE_DAYS[range];
    // Returns [[ms, open, high, low, close], ...]; the public tier omits volume.
    const raw = (await getJson(`${BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days}`)) as number[][];
    const candles: Candle[] = raw
      .filter((r): r is [number, number, number, number, number] => r.length >= 5)
      .map(([ms, open, high, low, close]) => ({
        time: Math.floor(ms / 1000),
        open,
        high,
        low,
        close,
        volume: 0,
      }));
    return sourced(candles, "live", PROVIDER);
  },
};
