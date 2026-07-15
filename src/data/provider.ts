import type {
  AnalystEstimates,
  AssetClass,
  Candle,
  DateRange,
  EarningsEvent,
  EconPoint,
  Fundamentals,
  Interval,
  NewsItem,
  NewsQuery,
  OrderBook,
  Ownership,
  Quote,
  Range,
  SearchResult,
  Sourced,
} from "@/data/types";

/**
 * The one interface every module depends on. Components call these methods
 * (via TanStack Query hooks) and never touch `fetch` or a mock generator
 * directly. Two things implement this contract:
 *   - `RoutingProvider` (server): real adapters + mock fallback.
 *   - `apiClientProvider` (client): fetches our own /api/data routes.
 * Swapping a data source is a change inside an adapter, never in a component.
 */
export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Sourced<Quote>>;
  getOHLCV(symbol: string, range: Range, interval: Interval): Promise<Sourced<Candle[]>>;
  getOrderBook(symbol: string, depth?: number): Promise<Sourced<OrderBook>>;
  getNews(query: NewsQuery): Promise<Sourced<NewsItem[]>>;
  getFundamentals(symbol: string): Promise<Sourced<Fundamentals>>;
  getAnalystEstimates(symbol: string): Promise<Sourced<AnalystEstimates>>;
  getOwnership(symbol: string): Promise<Sourced<Ownership>>;
  getEconomicSeries(seriesId: string): Promise<Sourced<EconPoint[]>>;
  getEarningsCalendar(range: DateRange): Promise<Sourced<EarningsEvent[]>>;
  search(query: string): Promise<Sourced<SearchResult[]>>;
}

/** Helper to wrap adapter output with provenance in one place. */
export function sourced<T>(
  data: T,
  source: Sourced<T>["source"],
  provider: string,
  asOf: number = Date.now(),
): Sourced<T> {
  return { data, source, provider, asOf };
}

const KNOWN_CRYPTO = new Set([
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "AVAX", "DOT", "LINK", "MATIC",
  "LTC", "BCH", "UNI", "ATOM", "XLM",
]);

const KNOWN_INDEX = new Set([
  "^GSPC", "^NDX", "^DJI", "^RUT", "^VIX", "SPX", "NDX", "DJIA", "RUT", "VIX",
]);

const KNOWN_ETF = new Set([
  "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "ARKK", "XLK", "XLF", "XLE", "GLD", "SLV",
]);

const COMMODITY_ROOTS = new Set(["GC", "SI", "CL", "NG", "HG", "ZC", "ZW", "ZS"]);

/**
 * Best-effort asset-class inference from a symbol. Routing and the mock
 * generator use this to pick a source and to keep mock data internally
 * plausible. Deliberately heuristic — not a security master.
 */
export function classifySymbol(symbol: string): AssetClass {
  const s = symbol.toUpperCase().trim();
  if (s.includes("/")) return "forex"; // EUR/USD
  const base = s.replace(/-USD$|-USDT$/i, "");
  if (KNOWN_CRYPTO.has(base) || /-USDT?$/i.test(s)) return "crypto";
  if (KNOWN_INDEX.has(s) || s.startsWith("^")) return "index";
  if (KNOWN_ETF.has(s)) return "etf";
  if (s.endsWith("=F") || COMMODITY_ROOTS.has(s.slice(0, 2))) return "commodity";
  if (/^US\d+Y$|^T\d+Y$/.test(s)) return "bond"; // US10Y
  if (/^[A-Z]{1,5}$/.test(s)) return "stock";
  return "unknown";
}
