import { describe, expect, it } from "vitest";
import { mockProvider } from "@/data/adapters/mock";
import { ECON_SERIES, YIELD_CURVE } from "@/config/econ";
import { UNIVERSES } from "@/config/universes";

/**
 * The mock's invariants.
 *
 * This file exists because simulated data fails silently: a wrong number looks
 * exactly like a right one, and the UI can't tell. Every case below was a real
 * bug found by looking at the rendered screen — a price above its own 52-week
 * high, a CPI index and an unemployment rate as the same line, a yield curve
 * shaped like a scribble, an IPO pricing on a Saturday. They're here so they
 * stay fixed.
 */

const ALL_SYMBOLS = Object.values(UNIVERSES).flatMap((u) => u.symbols);
const RANGE = { from: "2026-07-01", to: "2026-08-31" };
const DAY_MS = 86_400_000;

describe("quotes", () => {
  it("keeps a session's high and low around its open and close", async () => {
    for (const symbol of ALL_SYMBOLS.slice(0, 12)) {
      const { data: q } = await mockProvider.getQuote(symbol);
      expect(q.high, symbol).toBeGreaterThanOrEqual(Math.max(q.open, q.price));
      expect(q.low, symbol).toBeLessThanOrEqual(Math.min(q.open, q.price));
    }
  });

  it("is deterministic per symbol, so server and client agree", async () => {
    const a = await mockProvider.getQuote("AAPL");
    const b = await mockProvider.getQuote("AAPL");
    expect(a.data).toEqual(b.data);
  });

  it("labels itself as simulated", async () => {
    const { source } = await mockProvider.getQuote("AAPL");
    expect(source).toBe("simulated");
  });
});

describe("order book", () => {
  it("puts the best bid below the best ask", async () => {
    for (const symbol of ["AAPL", "BTC-USD", "EUR/USD"]) {
      const { data } = await mockProvider.getOrderBook(symbol);
      expect(data.bids[0]!.price, symbol).toBeLessThan(data.asks[0]!.price);
    }
  });
});

describe("fundamentals", () => {
  it("brackets the last price with the 52-week range, at every asset class", async () => {
    // The bug this replaces: NVDA showed 682.90 above its own 52-week high of
    // 509.20, because the range came from fixed bounds unrelated to the price.
    for (const symbol of ALL_SYMBOLS) {
      const [{ data: quote }, { data: f }] = await Promise.all([
        mockProvider.getQuote(symbol),
        mockProvider.getFundamentals(symbol),
      ]);
      expect(f.low52, `${symbol} low52 vs price`).toBeLessThanOrEqual(quote.price);
      expect(f.high52, `${symbol} high52 vs price`).toBeGreaterThanOrEqual(quote.price);
    }
  });

  it("pairs an industry with its own sector", async () => {
    // "Healthcare / Clothing" read as broken even though each half was plausible.
    const SECTOR_INDUSTRIES: Record<string, string[]> = {
      Technology: ["Semiconductors", "Software — Infrastructure", "Consumer Electronics", "IT Services"],
      Financials: ["Diversified Banks", "Asset Management", "Insurance — Property & Casualty", "Payment Processing"],
      Energy: ["Oil & Gas Integrated", "Oil & Gas Midstream", "Renewable Utilities", "Oilfield Services"],
      Healthcare: ["Pharmaceuticals", "Medical Devices", "Biotechnology", "Healthcare Plans"],
      Consumer: ["Discount Stores", "Beverages — Non-Alcoholic", "Restaurants", "Household Products"],
      Industrials: ["Aerospace & Defense", "Railroads", "Building Products", "Farm & Heavy Machinery"],
    };
    for (const symbol of ALL_SYMBOLS.slice(0, 20)) {
      const { data: f } = await mockProvider.getFundamentals(symbol);
      expect(SECTOR_INDUSTRIES[f.sector!], `${symbol} sector ${f.sector}`).toContain(f.industry);
    }
  });
});

describe("ownership", () => {
  it("splits holders into shares that sum to 100%", async () => {
    const { data } = await mockProvider.getOwnership("AAPL");
    expect(data.institutionalPct + data.insiderPct + data.retailPct).toBeCloseTo(100, 1);
  });
});

describe("economic series", () => {
  it("puts each indicator at its own real-world level", async () => {
    // Every series used to be the same anonymous 1–8 walk, so a CPI index and
    // an unemployment rate came back as the same line at the same height.
    for (const series of ECON_SERIES) {
      const { data } = await mockProvider.getEconomicSeries(series.id);
      const last = data.at(-1)!.value;
      if (series.mock.min !== undefined) expect(last, series.short).toBeGreaterThanOrEqual(series.mock.min);
      if (series.mock.max !== undefined) expect(last, series.short).toBeLessThanOrEqual(series.mock.max);
      // The latest point is anchored to the declared level.
      expect(last, series.short).toBeCloseTo(series.mock.level, 1);
    }
  });

  it("tells a rate apart from an index", async () => {
    const unrate = (await mockProvider.getEconomicSeries("UNRATE")).data.at(-1)!.value;
    const cpi = (await mockProvider.getEconomicSeries("CPIAUCSL")).data.at(-1)!.value;
    expect(unrate).toBeLessThan(12);
    expect(cpi).toBeGreaterThan(250);
  });

  it("returns points oldest to newest", async () => {
    const { data } = await mockProvider.getEconomicSeries("UNRATE");
    for (let i = 1; i < data.length; i++) {
      expect(data[i]!.date >= data[i - 1]!.date).toBe(true);
    }
  });

  it("keeps the yield curve a curve, not a scribble", async () => {
    // Ten maturities each walking independently put 1Y above 3M above 10Y. The
    // shape lives across series, so the walk is anchored at the tip.
    const yields: number[] = [];
    for (const point of YIELD_CURVE) {
      yields.push((await mockProvider.getEconomicSeries(point.id)).data.at(-1)!.value);
    }
    let turns = 0;
    for (let i = 2; i < yields.length; i++) {
      const a = Math.sign(yields[i]! - yields[i - 1]!);
      const b = Math.sign(yields[i - 1]! - yields[i - 2]!);
      if (a !== 0 && b !== 0 && a !== b) turns++;
    }
    // A real curve bends once or twice; a scribble changes direction constantly.
    expect(turns).toBeLessThanOrEqual(3);
    expect(yields.every((y) => y > 0 && y < 9)).toBe(true);
  });
});

describe("calendars", () => {
  const today = () => new Date().toISOString().slice(0, 10);
  const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay());

  it("never prints an 'actual' for a release that hasn't happened", async () => {
    const { data } = await mockProvider.getEconomicCalendar(RANGE);
    for (const e of data.filter((e) => e.date > today())) {
      expect(e.actual, `${e.title} on ${e.date}`).toBeUndefined();
    }
  });

  it("always has an 'actual' for a release that has", async () => {
    // A window firmly in the past, so there's something to assert against.
    const past = {
      from: new Date(Date.now() - 60 * DAY_MS).toISOString().slice(0, 10),
      to: new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10),
    };
    const { data } = await mockProvider.getEconomicCalendar(past);
    expect(data.length).toBeGreaterThan(0);
    for (const e of data) expect(e.actual, `${e.title} on ${e.date}`).toBeDefined();
  });

  it("keeps every event off the weekend", async () => {
    // Markets don't price an IPO on a Saturday.
    const [econ, ipo, earnings] = await Promise.all([
      mockProvider.getEconomicCalendar(RANGE),
      mockProvider.getIpoCalendar(RANGE),
      mockProvider.getEarningsCalendar(RANGE),
    ]);
    for (const e of econ.data) expect(isWeekend(e.date), `econ ${e.title} ${e.date}`).toBe(false);
    for (const e of ipo.data) expect(isWeekend(e.date), `ipo ${e.symbol} ${e.date}`).toBe(false);
    for (const e of earnings.data) expect(isWeekend(e.date), `earnings ${e.symbol} ${e.date}`).toBe(false);
  });

  it("keeps an IPO price range the right way round, and withdrawn deals unpriced", async () => {
    const { data } = await mockProvider.getIpoCalendar(RANGE);
    for (const e of data) {
      if (e.priceLow !== undefined && e.priceHigh !== undefined) {
        expect(e.priceLow, e.symbol).toBeLessThanOrEqual(e.priceHigh);
      }
      // A withdrawn deal never priced, so it carries no range.
      if (e.status === "withdrawn") expect(e.priceLow, e.symbol).toBeUndefined();
      if (e.date > today()) expect(e.status, e.symbol).toBe("expected");
    }
  });

  it("returns events in date order", async () => {
    const { data } = await mockProvider.getEconomicCalendar(RANGE);
    for (let i = 1; i < data.length; i++) {
      expect(data[i]!.date >= data[i - 1]!.date).toBe(true);
    }
  });
});
