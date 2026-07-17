import { describe, expect, it } from "vitest";
import { fuzzyMatch, fuzzyMatchFields } from "@/lib/fuzzy";

/**
 * The palette's ranking. What matters isn't that a query matches, but that the
 * right thing comes FIRST — so most of these assert an order, not a boolean.
 */

const scoreOf = (text: string, query: string) => fuzzyMatch(text, query)?.score ?? -Infinity;

describe("fuzzyMatch", () => {
  it("rejects anything that isn't a subsequence", () => {
    expect(fuzzyMatch("AAPL", "xyz")).toBeNull();
    expect(fuzzyMatch("AAPL", "apx")).toBeNull();
  });

  it("matches everything on an empty query, so the palette can show a default", () => {
    expect(fuzzyMatch("AAPL", "")).toEqual({ score: 0, indices: [] });
  });

  it("ranks exact over prefix over word-boundary over scattered", () => {
    const exact = scoreOf("BTC", "btc");
    const prefix = scoreOf("BTC-USD", "btc");
    const boundary = scoreOf("Bitcoin Trust Co", "btc"); // B·T·C on word starts
    const scattered = scoreOf("Robotics Inc", "btc"); // o-B-o-T-i-C-s
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(boundary);
    expect(boundary).toBeGreaterThan(scattered);
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatch("AAPL", "aapl")).not.toBeNull();
    expect(fuzzyMatch("aapl", "AAPL")).not.toBeNull();
  });

  it("prefers the shorter of two equally-good prefix matches", () => {
    // Typing "eur" should favour EUR/USD over a longer name that also starts so.
    expect(scoreOf("EUR/USD", "eur")).toBeGreaterThan(scoreOf("EUR/USD Forward Rate Agreement", "eur"));
  });

  it("returns the indices it matched, for highlighting", () => {
    expect(fuzzyMatch("AAPL", "aap")?.indices).toEqual([0, 1, 2]);
    expect(fuzzyMatch("BTC-USD", "usd")?.indices).toEqual([4, 5, 6]);
  });

  it("handles symbols with separators", () => {
    expect(fuzzyMatch("EUR/USD", "usd")).not.toBeNull();
    expect(fuzzyMatch("GC=F", "gc")).not.toBeNull();
    expect(fuzzyMatch("^GSPC", "gspc")).not.toBeNull();
    expect(fuzzyMatch("BTC-USD", "btcusd")).not.toBeNull();
  });
});

describe("fuzzyMatchFields", () => {
  it("reports which field won, so the caller highlights the right text", () => {
    const m = fuzzyMatchFields({ title: "BTC-USD", subtitle: "Bitcoin" }, "bitcoin");
    expect(m?.field).toBe("subtitle");
  });

  it("lets weights put a ticker hit above a description hit", () => {
    // "cost" is a prefix of COST and also sits inside "Costco Wholesale".
    const ticker = fuzzyMatchFields({ title: "COST", subtitle: "Costco Wholesale Corp." }, "cost", {
      title: 1,
      subtitle: 0.55,
    });
    expect(ticker?.field).toBe("title");
  });

  it("skips empty fields rather than matching them", () => {
    const m = fuzzyMatchFields({ title: "AAPL", subtitle: "" }, "aapl");
    expect(m?.field).toBe("title");
  });

  it("returns null when no field matches", () => {
    expect(fuzzyMatchFields({ title: "AAPL", subtitle: "Apple Inc." }, "zzz")).toBeNull();
  });
});
