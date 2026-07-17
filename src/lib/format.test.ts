import { describe, expect, it } from "vitest";
import { formatCompact, formatPercent, formatPrice, formatRelativeTime, formatSigned, priceDigits } from "@/lib/format";

describe("priceDigits", () => {
  /**
   * This rule lived in six components that disagreed with each other — bonds got
   * three decimals in the workspace and two on the markets chip. It's one
   * function now, and these pin the answer per asset class.
   */
  it("quotes FX to four places", () => {
    expect(priceDigits("EUR/USD", 1.0812)).toBe(4);
    expect(priceDigits("USD/JPY", 151.2)).toBe(4); // still 4, even above 10
  });

  it("quotes bond yields to three", () => {
    expect(priceDigits("US10Y", 4.261)).toBe(3);
    expect(priceDigits("US2Y", 4.18)).toBe(3);
  });

  it("gives sub-$10 instruments the extra places they need to move", () => {
    expect(priceDigits("DOGE-USD", 0.4213)).toBe(4);
    expect(priceDigits("AAPL", 9.99)).toBe(4);
  });

  it("quotes ordinary equities and crypto to cents", () => {
    expect(priceDigits("AAPL", 315.32)).toBe(2);
    expect(priceDigits("BTC-USD", 63_118)).toBe(2);
  });

  it("falls back to cents when the price hasn't loaded", () => {
    expect(priceDigits("AAPL")).toBe(2);
    // Class-based rules don't need the price at all.
    expect(priceDigits("EUR/USD")).toBe(4);
    expect(priceDigits("US10Y")).toBe(3);
  });
});

describe("formatters", () => {
  it("formats prices with grouping and fixed decimals", () => {
    expect(formatPrice(1234.5, 2)).toBe("1,234.50");
    expect(formatPrice(1.08123, 4)).toBe("1.0812");
  });

  it("signs a change, including zero as positive", () => {
    expect(formatSigned(12.3)).toBe("+12.30");
    expect(formatSigned(-12.3)).toBe("-12.30");
    // Zero carries no "+": it didn't move.
    expect(formatSigned(0)).toBe("0.00");
  });

  it("formats percentages off the signed form", () => {
    expect(formatPercent(1.234)).toBe("+1.23%");
    expect(formatPercent(-1.234)).toBe("-1.23%");
  });

  it("compacts large volumes", () => {
    expect(formatCompact(1_200_000)).toBe("1.2M");
    expect(formatCompact(3_400_000_000)).toBe("3.4B");
  });

  it("reads a timestamp's age at a glance", () => {
    const now = Date.UTC(2026, 6, 17, 12, 0, 0);
    expect(formatRelativeTime(now - 30_000, now)).toBe("now");
    expect(formatRelativeTime(now - 4 * 60_000, now)).toBe("4m");
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3h");
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe("2d");
  });
});
