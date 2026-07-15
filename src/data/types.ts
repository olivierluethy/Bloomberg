/**
 * Normalized domain types. Every adapter (real or mock) maps its raw payload
 * into these shapes, so the UI can never tell a live quote from a simulated one
 * except by reading the `source` tag on the wrapper.
 */

/** Where a piece of data came from. Drives the dev-only provenance indicator. */
export type Provenance = "live" | "simulated" | "cached";

/** Everything crossing the data boundary is wrapped so provenance travels with it. */
export interface Sourced<T> {
  data: T;
  source: Provenance;
  /** Human-readable adapter name, e.g. "CoinGecko", "Mock". */
  provider: string;
  /** Epoch ms when the value was produced. */
  asOf: number;
}

export type AssetClass =
  | "stock"
  | "etf"
  | "index"
  | "commodity"
  | "bond"
  | "forex"
  | "crypto"
  | "unknown";

export interface Quote {
  symbol: string;
  price: number;
  /** Absolute change vs previous close. */
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume?: number;
  currency: string;
}

export type Range = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y";
export type Interval = "1min" | "5min" | "15min" | "1h" | "1day" | "1week";

/** OHLCV bar. `time` is epoch seconds (TradingView convention, used in Phase 4). */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url?: string;
  publishedAt: number;
  category?: string;
  tickers?: string[];
  summary?: string;
}

export interface NewsQuery {
  symbol?: string;
  category?: string;
  limit?: number;
}

export interface Fundamentals {
  symbol: string;
  name?: string;
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  dividendYield?: number;
  beta?: number;
  high52?: number;
  low52?: number;
  sector?: string;
  industry?: string;
  description?: string;
}

export interface AnalystEstimate {
  period: string;
  revenueAvg: number;
  epsAvg: number;
  numAnalysts: number;
}

export type AnalystRating = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";

export interface AnalystEstimates {
  symbol: string;
  rating: AnalystRating;
  targetMean: number;
  targetHigh: number;
  targetLow: number;
  estimates: AnalystEstimate[];
}

export interface OwnershipHolder {
  name: string;
  shares: number;
  pctOfShares: number;
}

export interface Ownership {
  symbol: string;
  institutionalPct: number;
  insiderPct: number;
  retailPct: number;
  topHolders: OwnershipHolder[];
}

export interface EconPoint {
  date: string;
  value: number;
}

export interface EarningsEvent {
  symbol: string;
  date: string;
  epsEstimate?: number;
  epsActual?: number;
  /** before market open / after market close / during market hours */
  time?: "bmo" | "amc" | "dmh";
}

export interface DateRange {
  from: string;
  to: string;
}

export interface SearchResult {
  symbol: string;
  description: string;
  assetClass: AssetClass;
}
