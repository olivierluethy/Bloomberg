import "server-only";

/**
 * Server-only access to provider API keys. Importing this from a client
 * component is a build error (the `server-only` guard), so keys can never leak
 * into the browser bundle. Missing key → that adapter reports unavailable and
 * the router falls back to the mock source.
 *
 * See .env.example for the variables. CoinGecko needs no key for its public
 * tier, so crypto quotes work out of the box.
 */
export const serverEnv = {
  finnhub: process.env.FINNHUB_API_KEY ?? "",
  twelveData: process.env.TWELVE_DATA_API_KEY ?? "",
  fred: process.env.FRED_API_KEY ?? "",
  newsApi: process.env.NEWSAPI_KEY ?? "",
  coinGecko: process.env.COINGECKO_API_KEY ?? "", // optional; enables higher limits
} as const;

export const available = {
  finnhub: serverEnv.finnhub.length > 0,
  twelveData: serverEnv.twelveData.length > 0,
  fred: serverEnv.fred.length > 0,
  newsApi: serverEnv.newsApi.length > 0,
  coinGecko: true, // public tier is keyless
} as const;
