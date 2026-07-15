import { Faker, en } from "@faker-js/faker";
import { classifySymbol, sourced } from "@/data/provider";
import type { MarketDataProvider } from "@/data/provider";
import type {
  AnalystRating,
  AssetClass,
  Candle,
  Interval,
  NewsItem,
  OrderBookLevel,
  Range,
} from "@/data/types";

/**
 * Fully-simulated data source. Everything is seeded from the symbol, so the
 * same symbol yields the same numbers across calls and across server/client —
 * and every value is internally consistent (bid < ask, high ≥ open/close ≥ low,
 * ownership percentages sum to 100, price walks don't teleport).
 *
 * Used as the fallback for every real adapter, and as the only source for data
 * with no viable free feed (order books, estimates, ownership).
 */
const PROVIDER = "Mock";

function seededFaker(...parts: (string | number)[]): Faker {
  const key = parts.join(":");
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const f = new Faker({ locale: en });
  f.seed(hash >>> 0);
  return f;
}

interface PriceProfile {
  min: number;
  max: number;
  digits: number;
  currency: string;
}

function priceProfile(cls: AssetClass): PriceProfile {
  switch (cls) {
    case "crypto":
      return { min: 0.5, max: 68000, digits: 2, currency: "USD" };
    case "forex":
      return { min: 0.6, max: 1.6, digits: 4, currency: "USD" };
    case "index":
      return { min: 3000, max: 40000, digits: 2, currency: "USD" };
    case "commodity":
      return { min: 2, max: 2400, digits: 2, currency: "USD" };
    case "bond":
      return { min: 0.5, max: 6, digits: 3, currency: "%" };
    default:
      return { min: 12, max: 780, digits: 2, currency: "USD" };
  }
}

function basePrice(symbol: string, cls: AssetClass): number {
  const f = seededFaker(symbol, "base");
  const p = priceProfile(cls);
  return f.number.float({ min: p.min, max: p.max, fractionDigits: p.digits });
}

const RANGE_DAYS: Record<Range, number> = {
  "1D": 1, "5D": 5, "1M": 22, "3M": 66, "6M": 132, "1Y": 252, "5Y": 1260,
};
const INTERVAL_SEC: Record<Interval, number> = {
  "1min": 60, "5min": 300, "15min": 900, "1h": 3600, "1day": 86400, "1week": 604800,
};

export const mockProvider: MarketDataProvider = {
  async getQuote(symbol) {
    const cls = classifySymbol(symbol);
    const f = seededFaker(symbol, "quote");
    const profile = priceProfile(cls);
    const previousClose = basePrice(symbol, cls);
    const changePercent = f.number.float({ min: -3.2, max: 3.2, fractionDigits: 2 });
    const change = Number(((previousClose * changePercent) / 100).toFixed(profile.digits));
    const price = Number((previousClose + change).toFixed(profile.digits));
    const open = Number(
      (previousClose * (1 + f.number.float({ min: -0.01, max: 0.01, fractionDigits: 4 }))).toFixed(profile.digits),
    );
    const high = Number((Math.max(open, price) * (1 + f.number.float({ min: 0, max: 0.012, fractionDigits: 4 }))).toFixed(profile.digits));
    const low = Number((Math.min(open, price) * (1 - f.number.float({ min: 0, max: 0.012, fractionDigits: 4 }))).toFixed(profile.digits));
    const volume = cls === "forex" || cls === "bond" ? undefined : f.number.int({ min: 1e5, max: 8e7 });
    return sourced(
      { symbol, price, change, changePercent, open, high, low, previousClose, volume, currency: profile.currency },
      "simulated",
      PROVIDER,
    );
  },

  async getOHLCV(symbol, range: Range, interval: Interval) {
    const cls = classifySymbol(symbol);
    const profile = priceProfile(cls);
    const f = seededFaker(symbol, "ohlcv", range, interval);
    const stepSec = INTERVAL_SEC[interval];
    const count = Math.min(500, Math.max(30, Math.ceil((RANGE_DAYS[range] * 86400) / stepSec)));
    const nowSec = Math.floor(Date.now() / 1000);
    const start = nowSec - count * stepSec;

    const candles: Candle[] = [];
    let close = basePrice(symbol, cls);
    for (let i = 0; i < count; i++) {
      const open = close;
      const drift = f.number.float({ min: -0.018, max: 0.018, fractionDigits: 4 });
      close = Math.max(profile.min * 0.5, Number((open * (1 + drift)).toFixed(profile.digits)));
      const high = Number((Math.max(open, close) * (1 + f.number.float({ min: 0, max: 0.01, fractionDigits: 4 }))).toFixed(profile.digits));
      const low = Number((Math.min(open, close) * (1 - f.number.float({ min: 0, max: 0.01, fractionDigits: 4 }))).toFixed(profile.digits));
      const volume = cls === "forex" ? 0 : f.number.int({ min: 1e4, max: 5e6 });
      candles.push({ time: start + i * stepSec, open, high, low, close, volume });
    }
    return sourced(candles, "simulated", PROVIDER);
  },

  async getOrderBook(symbol, depth = 12) {
    const cls = classifySymbol(symbol);
    const profile = priceProfile(cls);
    const f = seededFaker(symbol, "book");
    const mid = basePrice(symbol, cls);
    const tick = Math.max(10 ** -profile.digits, mid * 0.0001);
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    for (let i = 1; i <= depth; i++) {
      bids.push({
        price: Number((mid - tick * i).toFixed(profile.digits)),
        size: f.number.int({ min: 100, max: 25000 }),
      });
      asks.push({
        price: Number((mid + tick * i).toFixed(profile.digits)),
        size: f.number.int({ min: 100, max: 25000 }),
      });
    }
    // Invariant: best bid strictly below best ask.
    return sourced({ symbol, bids, asks }, "simulated", PROVIDER);
  },

  async getNews(query) {
    const f = seededFaker(query.symbol ?? query.category ?? "market", "news");
    const limit = query.limit ?? 12;
    const templates = [
      "{c} beats quarterly estimates as demand accelerates",
      "Analysts raise price target on {c} after guidance update",
      "{c} announces buyback program, shares climb",
      "Regulators open review into {c} pricing practices",
      "{c} names new CFO amid restructuring",
      "Supply constraints weigh on {c} outlook",
      "{c} expands into new markets with strategic partnership",
      "Downgrade: broker cools on {c} valuation",
    ];
    const now = Date.now();
    const tickerPool = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "JPM", "XOM", "SPY", "BTC-USD"];
    const items: NewsItem[] = Array.from({ length: limit }).map((_, i) => {
      const company = query.symbol ?? f.company.name();
      const template = f.helpers.arrayElement(templates);
      const tickers = query.symbol
        ? [query.symbol]
        : f.helpers.arrayElements(tickerPool, { min: 1, max: 3 });
      return {
        id: `${query.symbol ?? "mkt"}-${i}`,
        headline: template.replace("{c}", company),
        source: f.helpers.arrayElement(["Reuters", "MarketWatch", "The Ledger", "Capital Wire", "FinDesk"]),
        publishedAt: now - i * f.number.int({ min: 6e5, max: 5.4e6 }),
        category: query.category ?? f.helpers.arrayElement(["Markets", "Earnings", "Macro", "Tech", "Energy"]),
        tickers,
        summary: f.lorem.sentence({ min: 10, max: 18 }),
      };
    });
    return sourced(items, "simulated", PROVIDER);
  },

  async getFundamentals(symbol) {
    const f = seededFaker(symbol, "fund");
    return sourced(
      {
        symbol,
        name: `${symbol} Holdings Inc.`,
        marketCap: f.number.int({ min: 5e8, max: 3e12 }),
        peRatio: f.number.float({ min: 6, max: 55, fractionDigits: 1 }),
        eps: f.number.float({ min: -2, max: 22, fractionDigits: 2 }),
        dividendYield: f.number.float({ min: 0, max: 5.5, fractionDigits: 2 }),
        beta: f.number.float({ min: 0.4, max: 2.1, fractionDigits: 2 }),
        high52: f.number.float({ min: 120, max: 900, fractionDigits: 2 }),
        low52: f.number.float({ min: 20, max: 110, fractionDigits: 2 }),
        sector: f.helpers.arrayElement(["Technology", "Financials", "Energy", "Healthcare", "Consumer", "Industrials"]),
        industry: f.commerce.department(),
        description: f.company.catchPhrase(),
      },
      "simulated",
      PROVIDER,
    );
  },

  async getAnalystEstimates(symbol) {
    const f = seededFaker(symbol, "est");
    const rating = f.helpers.arrayElement<AnalystRating>(["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"]);
    const targetMean = f.number.float({ min: 30, max: 600, fractionDigits: 2 });
    const estimates = ["FY24", "FY25", "FY26", "FY27"].map((period, i) => ({
      period,
      revenueAvg: f.number.int({ min: 1e9, max: 4e11 }) * (1 + i * 0.08),
      epsAvg: f.number.float({ min: 1, max: 18, fractionDigits: 2 }) * (1 + i * 0.06),
      numAnalysts: f.number.int({ min: 6, max: 42 }),
    }));
    return sourced(
      {
        symbol,
        rating,
        targetMean,
        targetHigh: Number((targetMean * 1.18).toFixed(2)),
        targetLow: Number((targetMean * 0.82).toFixed(2)),
        estimates,
      },
      "simulated",
      PROVIDER,
    );
  },

  async getOwnership(symbol) {
    const f = seededFaker(symbol, "own");
    // Percentages are constructed to sum to exactly 100.
    const institutionalPct = f.number.float({ min: 45, max: 82, fractionDigits: 1 });
    const insiderPct = f.number.float({ min: 1, max: 12, fractionDigits: 1 });
    const retailPct = Number((100 - institutionalPct - insiderPct).toFixed(1));
    const topHolders = Array.from({ length: 6 }).map(() => {
      const shares = f.number.int({ min: 1e6, max: 3e8 });
      return {
        name: `${f.company.name()} ${f.helpers.arrayElement(["Capital", "Advisors", "Asset Mgmt", "Partners"])}`,
        shares,
        pctOfShares: f.number.float({ min: 0.5, max: 9, fractionDigits: 2 }),
      };
    });
    return sourced({ symbol, institutionalPct, insiderPct, retailPct, topHolders }, "simulated", PROVIDER);
  },

  async getEconomicSeries(seriesId) {
    const f = seededFaker(seriesId, "econ");
    const now = new Date();
    let value = f.number.float({ min: 1, max: 8, fractionDigits: 2 });
    const points = Array.from({ length: 36 }).map((_, i) => {
      value = Math.max(0, value + f.number.float({ min: -0.25, max: 0.25, fractionDigits: 2 }));
      const d = new Date(now.getFullYear(), now.getMonth() - (35 - i), 1);
      return { date: d.toISOString().slice(0, 10), value: Number(value.toFixed(2)) };
    });
    return sourced(points, "simulated", PROVIDER);
  },

  async getEarningsCalendar(range) {
    const f = seededFaker(range.from, range.to, "earn");
    const tickers = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA", "META", "GOOGL", "JPM", "XOM", "WMT"];
    const events = tickers.map((symbol) => ({
      symbol,
      date: f.date.between({ from: range.from, to: range.to }).toISOString().slice(0, 10),
      epsEstimate: f.number.float({ min: 0.2, max: 6, fractionDigits: 2 }),
      time: f.helpers.arrayElement<"bmo" | "amc" | "dmh">(["bmo", "amc", "dmh"]),
    }));
    return sourced(events, "simulated", PROVIDER);
  },

  async search(query) {
    const f = seededFaker(query, "search");
    const results = Array.from({ length: 6 }).map(() => {
      const symbol = f.string.alpha({ length: { min: 2, max: 4 }, casing: "upper" });
      return { symbol, description: `${f.company.name()} — matches “${query}”`, assetClass: classifySymbol(symbol) };
    });
    return sourced(results, "simulated", PROVIDER);
  },
};
