/**
 * The searchable symbol catalog behind the command palette.
 *
 * Derived from `UNIVERSES` so the module panels and search never drift: adding a
 * symbol to a universe makes it searchable automatically. The names map only
 * supplies a human label — a symbol with no entry still searches by ticker.
 *
 * Free tiers offer no symbol master, and the mock `search()` returns random
 * tickers, so a curated local catalog is both faster and more honest than a
 * network round-trip per keystroke.
 */

import { UNIVERSES } from "@/config/universes";
import { classifySymbol } from "@/data/provider";
import type { AssetClass } from "@/data/types";

export interface SymbolEntry {
  symbol: string;
  /** Display name, e.g. "Apple Inc." — falls back to the symbol itself. */
  name: string;
  assetClass: AssetClass;
  /** Module id owning this symbol, used to route from a search hit. */
  moduleId: string;
}

const NAMES: Record<string, string> = {
  // Stocks
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  NVDA: "NVIDIA Corp.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms Inc.",
  TSLA: "Tesla Inc.",
  JPM: "JPMorgan Chase & Co.",
  V: "Visa Inc.",
  WMT: "Walmart Inc.",
  XOM: "Exxon Mobil Corp.",
  UNH: "UnitedHealth Group Inc.",
  JNJ: "Johnson & Johnson",
  PG: "Procter & Gamble Co.",
  MA: "Mastercard Inc.",
  HD: "Home Depot Inc.",
  COST: "Costco Wholesale Corp.",
  ORCL: "Oracle Corp.",
  BAC: "Bank of America Corp.",
  KO: "Coca-Cola Co.",

  // ETFs
  SPY: "SPDR S&P 500 ETF Trust",
  QQQ: "Invesco QQQ Trust",
  IWM: "iShares Russell 2000 ETF",
  DIA: "SPDR Dow Jones Industrial Average ETF",
  VTI: "Vanguard Total Stock Market ETF",
  VOO: "Vanguard S&P 500 ETF",
  ARKK: "ARK Innovation ETF",
  XLK: "Technology Select Sector SPDR",
  XLF: "Financial Select Sector SPDR",
  XLE: "Energy Select Sector SPDR",
  GLD: "SPDR Gold Shares",
  SLV: "iShares Silver Trust",
  EEM: "iShares MSCI Emerging Markets ETF",
  TLT: "iShares 20+ Year Treasury Bond ETF",
  HYG: "iShares iBoxx High Yield Corporate Bond ETF",

  // Indices
  "^GSPC": "S&P 500 Index",
  "^NDX": "Nasdaq 100 Index",
  "^DJI": "Dow Jones Industrial Average",
  "^RUT": "Russell 2000 Index",
  "^VIX": "CBOE Volatility Index",

  // Commodities
  "GC=F": "Gold Futures",
  "SI=F": "Silver Futures",
  "CL=F": "Crude Oil (WTI) Futures",
  "NG=F": "Natural Gas Futures",
  "HG=F": "Copper Futures",
  "ZC=F": "Corn Futures",
  "ZW=F": "Wheat Futures",
  "ZS=F": "Soybean Futures",

  // Bonds
  US2Y: "US 2-Year Treasury Yield",
  US5Y: "US 5-Year Treasury Yield",
  US10Y: "US 10-Year Treasury Yield",
  US30Y: "US 30-Year Treasury Yield",

  // Forex
  "EUR/USD": "Euro / US Dollar",
  "GBP/USD": "British Pound / US Dollar",
  "USD/JPY": "US Dollar / Japanese Yen",
  "USD/CHF": "US Dollar / Swiss Franc",
  "AUD/USD": "Australian Dollar / US Dollar",
  "USD/CAD": "US Dollar / Canadian Dollar",
  "NZD/USD": "New Zealand Dollar / US Dollar",
  "EUR/GBP": "Euro / British Pound",

  // Crypto
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "SOL-USD": "Solana",
  "XRP-USD": "XRP",
  "ADA-USD": "Cardano",
  "DOGE-USD": "Dogecoin",
  "AVAX-USD": "Avalanche",
  "DOT-USD": "Polkadot",
  "LINK-USD": "Chainlink",
  "MATIC-USD": "Polygon",
};

export const SYMBOL_CATALOG: SymbolEntry[] = Object.entries(UNIVERSES).flatMap(
  ([moduleId, universe]) =>
    universe.symbols.map((symbol) => ({
      symbol,
      name: NAMES[symbol] ?? symbol,
      assetClass: classifySymbol(symbol),
      moduleId,
    })),
);

const BY_SYMBOL = new Map(SYMBOL_CATALOG.map((entry) => [entry.symbol, entry]));

export function findSymbol(symbol: string): SymbolEntry | undefined {
  return BY_SYMBOL.get(symbol);
}

/** Display name for a symbol, falling back to the ticker for unknown ones. */
export function symbolName(symbol: string): string {
  return BY_SYMBOL.get(symbol)?.name ?? symbol;
}
