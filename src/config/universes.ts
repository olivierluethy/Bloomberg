/**
 * Curated symbol universes per asset-class module. Free tiers don't offer a
 * screener, so each panel loads quotes for a fixed, representative set. Crypto
 * symbols resolve to live CoinGecko data; the rest fall back to labeled mocks
 * until the corresponding API key is present.
 */

export interface AssetUniverse {
  symbols: string[];
  /** Whether a volume column makes sense for this class. */
  showVolume: boolean;
}

export const UNIVERSES: Record<string, AssetUniverse> = {
  stocks: {
    symbols: [
      "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "WMT",
      "XOM", "UNH", "JNJ", "PG", "MA", "HD", "COST", "ORCL", "BAC", "KO",
    ],
    showVolume: true,
  },
  etfs: {
    symbols: ["SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "ARKK", "XLK", "XLF", "XLE", "GLD", "SLV", "EEM", "TLT", "HYG"],
    showVolume: true,
  },
  indices: {
    symbols: ["^GSPC", "^NDX", "^DJI", "^RUT", "^VIX"],
    showVolume: false,
  },
  commodities: {
    symbols: ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F", "ZC=F", "ZW=F", "ZS=F"],
    showVolume: true,
  },
  bonds: {
    symbols: ["US2Y", "US5Y", "US10Y", "US30Y"],
    showVolume: false,
  },
  forex: {
    symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP"],
    showVolume: false,
  },
  crypto: {
    symbols: ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "ADA-USD", "DOGE-USD", "AVAX-USD", "DOT-USD", "LINK-USD", "MATIC-USD"],
    showVolume: true,
  },
};

/** Cross-asset set for the Markets overview watchlist. */
export const MARKETS_WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "TSLA", "SPY", "QQQ", "BTC-USD", "ETH-USD", "EUR/USD", "GC=F",
];

/** Representative symbol per class for the Markets overview summary row. */
export const MARKETS_SUMMARY = ["^GSPC", "^NDX", "AAPL", "BTC-USD", "EUR/USD", "GC=F", "US10Y"];

/** Liquid cross-asset set the Markets overview ranks for gainers/losers. */
export const MARKETS_MOVERS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA", "JPM", "XOM",
  "SPY", "QQQ", "ARKK", "XLE",
  "BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD",
];
