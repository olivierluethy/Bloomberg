import { describe, expect, it } from "vitest";
import {
  buildPositions,
  groupByValue,
  portfolioTotals,
  valuePositions,
  type Transaction,
} from "@/lib/portfolio";

/**
 * The portfolio maths is the one place in this app where a wrong number is
 * indistinguishable from a right one — every figure looks plausible. So the
 * cases below are chosen to *discriminate*: each would give a different answer
 * under the obvious wrong implementation (average cost instead of FIFO,
 * insertion order instead of chronological), and the comment says which.
 */

const tx = (
  o: Pick<Transaction, "symbol" | "side" | "quantity" | "price" | "at"> & Partial<Transaction>,
): Transaction => ({ id: `${o.symbol}-${o.side}-${o.at}`, ...o });

describe("buildPositions", () => {
  it("weights average cost by quantity, not by price", () => {
    const [p] = buildPositions([
      tx({ symbol: "AAPL", side: "buy", quantity: 10, price: 100, at: 1 }),
      tx({ symbol: "AAPL", side: "buy", quantity: 30, price: 200, at: 2 }),
    ]);
    // A mean of the two prices would say 150.
    expect(p?.avgCost).toBe(175);
    expect(p?.costBasis).toBe(7000);
    expect(p?.quantity).toBe(40);
  });

  it("realizes against the oldest lot first (FIFO)", () => {
    const [p] = buildPositions([
      tx({ symbol: "X", side: "buy", quantity: 10, price: 100, at: 1 }),
      tx({ symbol: "X", side: "buy", quantity: 10, price: 200, at: 2 }),
      tx({ symbol: "X", side: "sell", quantity: 10, price: 250, at: 3 }),
    ]);
    // Average cost would say 1000. FIFO sells the 100-lot: (250-100) * 10.
    expect(p?.realizedPnL).toBe(1500);
    expect(p?.costBasis).toBe(2000);
    expect(p?.avgCost).toBe(200);
    expect(p?.closedCostBasis).toBe(1000);
  });

  it("lets a sell span more than one lot", () => {
    const [p] = buildPositions([
      tx({ symbol: "Y", side: "buy", quantity: 10, price: 100, at: 1 }),
      tx({ symbol: "Y", side: "buy", quantity: 10, price: 200, at: 2 }),
      tx({ symbol: "Y", side: "sell", quantity: 15, price: 300, at: 3 }),
    ]);
    // All of the 100-lot + 5 of the 200-lot: cost 2000, proceeds 4500.
    expect(p?.realizedPnL).toBe(2500);
    expect(p?.quantity).toBe(5);
    expect(p?.costBasis).toBe(1000);
  });

  it("charges fees on both sides of a round trip", () => {
    const [p] = buildPositions([
      tx({ symbol: "F", side: "buy", quantity: 10, price: 100, fee: 10, at: 1 }),
      tx({ symbol: "F", side: "sell", quantity: 10, price: 100, fee: 10, at: 2 }),
    ]);
    // Same price in and out, so the loss is exactly the two fees.
    expect(p?.realizedPnL).toBe(-20);
    expect(p?.quantity).toBe(0);
  });

  it("replays chronologically, not in insertion order", () => {
    const [p] = buildPositions([
      tx({ symbol: "Z", side: "buy", quantity: 10, price: 200, at: 20 }),
      tx({ symbol: "Z", side: "sell", quantity: 10, price: 250, at: 30 }),
      // Backdated, entered last — but it happened first, so FIFO must sell it.
      tx({ symbol: "Z", side: "buy", quantity: 10, price: 100, at: 10 }),
    ]);
    // Insertion order would say 500.
    expect(p?.realizedPnL).toBe(1500);
  });

  it("never invents a short from an unbacked sell", () => {
    const [p] = buildPositions([
      tx({ symbol: "S", side: "buy", quantity: 5, price: 100, at: 1 }),
      tx({ symbol: "S", side: "sell", quantity: 50, price: 120, at: 2 }),
    ]);
    expect(p?.quantity).toBe(0);
    // Only the 5 units that existed realize anything.
    expect(p?.realizedPnL).toBe(100);
  });

  it("ignores nonsense quantities", () => {
    expect(buildPositions([tx({ symbol: "N", side: "buy", quantity: 0, price: 10, at: 1 })])).toHaveLength(0);
    expect(buildPositions([tx({ symbol: "N", side: "buy", quantity: -5, price: 10, at: 1 })])).toHaveLength(0);
  });

  it("keeps a closed position that still carries realized P&L", () => {
    const positions = buildPositions([
      tx({ symbol: "C", side: "buy", quantity: 1, price: 10, at: 1 }),
      tx({ symbol: "C", side: "sell", quantity: 1, price: 20, at: 2 }),
    ]);
    // The units are gone but the +10 is history worth reporting.
    expect(positions).toHaveLength(1);
    expect(positions[0]?.quantity).toBe(0);
    expect(positions[0]?.realizedPnL).toBe(10);
  });
});

describe("valuePositions", () => {
  const positions = () =>
    buildPositions([
      tx({ symbol: "A", side: "buy", quantity: 10, price: 100, at: 1 }),
      tx({ symbol: "B", side: "buy", quantity: 5, price: 200, at: 1 }),
    ]);

  it("values holdings and weights them by market value", () => {
    const valued = valuePositions(positions(), {
      A: { price: 150, change: 5 },
      B: { price: 100, change: -2 },
    });
    const a = valued.find((p) => p.symbol === "A");
    expect(a?.marketValue).toBe(1500);
    expect(a?.unrealizedPnL).toBe(500);
    expect(a?.weight).toBe(75);
    expect(valued.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(100);
  });

  it("flags a holding with no quote instead of valuing it at zero", () => {
    const valued = valuePositions(positions(), { A: { price: 150, change: 0 } });
    expect(valued.find((p) => p.symbol === "B")?.pending).toBe(true);
  });
});

describe("portfolioTotals", () => {
  it("nets winners against losers and measures the day against yesterday", () => {
    const valued = valuePositions(
      buildPositions([
        tx({ symbol: "A", side: "buy", quantity: 10, price: 100, at: 1 }),
        tx({ symbol: "B", side: "buy", quantity: 5, price: 200, at: 1 }),
      ]),
      { A: { price: 150, change: 5 }, B: { price: 100, change: -2 } },
    );
    const t = portfolioTotals(valued);
    expect(t.marketValue).toBe(2000);
    expect(t.unrealizedPnL).toBe(0);
    expect(t.dayPnL).toBe(40);
    // 40 gained on a portfolio that was worth 1960 yesterday.
    expect(t.dayPct).toBeCloseTo((40 / 1960) * 100);
  });

  it("excludes unpriced holdings from the total rather than under-reporting it", () => {
    const valued = valuePositions(
      buildPositions([
        tx({ symbol: "A", side: "buy", quantity: 10, price: 100, at: 1 }),
        tx({ symbol: "NOQUOTE", side: "buy", quantity: 10, price: 100, at: 1 }),
      ]),
      { A: { price: 150, change: 0 } },
    );
    const t = portfolioTotals(valued);
    // A market value of 1500 against a basis of 1000 — the missing leg is out of
    // both, so the percentage stays honest.
    expect(t.marketValue).toBe(1500);
    expect(t.costBasis).toBe(1000);
  });

  it("measures total return over deployed capital", () => {
    const valued = valuePositions(
      buildPositions([
        tx({ symbol: "R", side: "buy", quantity: 10, price: 100, at: 1 }),
        tx({ symbol: "R", side: "sell", quantity: 5, price: 200, at: 2 }),
      ]),
      { R: { price: 200, change: 0 } },
    );
    const t = portfolioTotals(valued);
    // +500 realized and +500 unrealized on 1000 deployed.
    expect(t.totalPnL).toBe(1000);
    expect(t.totalReturnPct).toBe(100);
  });

  it("reports realized P&L even while quotes are still loading", () => {
    const valued = valuePositions(
      buildPositions([
        tx({ symbol: "R", side: "buy", quantity: 10, price: 100, at: 1 }),
        tx({ symbol: "R", side: "sell", quantity: 5, price: 200, at: 2 }),
      ]),
      {}, // nothing priced yet
    );
    // Realized is history; it doesn't depend on today's quote.
    expect(portfolioTotals(valued).realizedPnL).toBe(500);
  });
});

describe("groupByValue", () => {
  it("groups by key, largest first, weighted to 100", () => {
    const valued = valuePositions(
      buildPositions([
        tx({ symbol: "A", side: "buy", quantity: 10, price: 100, at: 1 }),
        tx({ symbol: "B", side: "buy", quantity: 10, price: 100, at: 1 }),
      ]),
      { A: { price: 300, change: 0 }, B: { price: 100, change: 0 } },
    );
    const groups = groupByValue(valued, (p) => (p.symbol === "A" ? "stock" : "crypto"));
    expect(groups[0]?.key).toBe("stock");
    expect(groups.reduce((s, g) => s + g.weight, 0)).toBeCloseTo(100);
  });
});
