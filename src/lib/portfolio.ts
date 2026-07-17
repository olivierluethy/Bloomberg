/**
 * Portfolio math. Pure, dependency-free, and deliberately separate from both the
 * store and the components so it can be reasoned about (and tested) on its own.
 *
 * The instruments may be simulated, but none of this is: positions are built by
 * replaying transactions through FIFO lots, and every P&L figure is derived from
 * that ledger. Nothing here invents a number.
 *
 * Conventions:
 *  - Fees increase the cost of a buy and reduce the proceeds of a sell, so they
 *    land in realized P&L rather than silently vanishing.
 *  - Money is kept as plain floats and rounded only for display. Positions are
 *    small enough that float drift stays far below a cent.
 */

export type TxSide = "buy" | "sell";

export interface Transaction {
  id: string;
  symbol: string;
  side: TxSide;
  /** Units traded. Always positive; `side` carries the direction. */
  quantity: number;
  /** Price per unit. */
  price: number;
  /** Commission for the trade, in currency. */
  fee?: number;
  /** Epoch ms. Replay order is chronological, not insertion order. */
  at: number;
}

/** An open tax lot: units bought at a price, oldest consumed first. */
export interface Lot {
  quantity: number;
  /** Per-unit cost including the buy's apportioned fee. */
  price: number;
  at: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  /** Weighted-average cost of the units still held. */
  avgCost: number;
  /** What the remaining units cost — the basis unrealized P&L measures against. */
  costBasis: number;
  realizedPnL: number;
  /** Cost of units already sold, so realized P&L has a basis to be a % of. */
  closedCostBasis: number;
  lots: Lot[];
}

/**
 * Replays a ledger into positions using FIFO lots.
 *
 * Transactions are sorted chronologically first: a ledger is a set of events,
 * and entering a backdated trade must not change the answer.
 *
 * This is a long-only model — a sell with no lots behind it is not a short, it's
 * a nonsense entry, so the unbacked units are dropped rather than invented into
 * a negative position. The store won't let the UI create one.
 */
export function buildPositions(transactions: Transaction[]): Position[] {
  const ordered = [...transactions].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const bySymbol = new Map<string, Position>();

  for (const tx of ordered) {
    if (!Number.isFinite(tx.quantity) || tx.quantity <= 0) continue;

    const pos = bySymbol.get(tx.symbol) ?? {
      symbol: tx.symbol,
      quantity: 0,
      avgCost: 0,
      costBasis: 0,
      realizedPnL: 0,
      closedCostBasis: 0,
      lots: [],
    };

    if (tx.side === "buy") {
      // The fee is part of what the units cost you.
      const unitCost = tx.price + (tx.fee ?? 0) / tx.quantity;
      pos.lots.push({ quantity: tx.quantity, price: unitCost, at: tx.at });
    } else {
      let remaining = tx.quantity;
      let costOfSold = 0;
      let unitsSold = 0;

      while (remaining > 0 && pos.lots.length > 0) {
        const lot = pos.lots[0]!;
        const take = Math.min(lot.quantity, remaining);
        costOfSold += take * lot.price;
        unitsSold += take;
        lot.quantity -= take;
        remaining -= take;
        if (lot.quantity <= 0) pos.lots.shift();
      }

      if (unitsSold > 0) {
        // Fee is apportioned to the units that actually filled.
        const feeShare = ((tx.fee ?? 0) * unitsSold) / tx.quantity;
        const proceeds = unitsSold * tx.price - feeShare;
        pos.realizedPnL += proceeds - costOfSold;
        pos.closedCostBasis += costOfSold;
      }
    }

    recompute(pos);
    bySymbol.set(tx.symbol, pos);
  }

  // A fully-closed position still carries realized P&L worth reporting; one that
  // never held anything is just noise.
  return [...bySymbol.values()].filter((p) => p.quantity > 0 || p.realizedPnL !== 0);
}

function recompute(pos: Position): void {
  pos.quantity = pos.lots.reduce((sum, l) => sum + l.quantity, 0);
  pos.costBasis = pos.lots.reduce((sum, l) => sum + l.quantity * l.price, 0);
  pos.avgCost = pos.quantity > 0 ? pos.costBasis / pos.quantity : 0;
}

/** Live-market inputs for one symbol. */
export interface MarketInput {
  price: number;
  /** Absolute move vs previous close, used for the day column. */
  change: number;
}

export interface ValuedPosition extends Position {
  price: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPct: number;
  dayPnL: number;
  /** Share of total market value, 0–100. */
  weight: number;
  /** True when the quote hasn't loaded — the row is real, the valuation isn't. */
  pending: boolean;
}

export interface PortfolioTotals {
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPct: number;
  realizedPnL: number;
  dayPnL: number;
  dayPct: number;
  /** Unrealized + realized. */
  totalPnL: number;
  /** Return on capital actually deployed: total P&L over open + closed basis. */
  totalReturnPct: number;
}

/**
 * Values positions against quotes. Symbols with no quote yet are kept, marked
 * `pending`, and left out of the totals — a half-loaded portfolio must not
 * report a market value that's quietly missing a holding.
 */
export function valuePositions(
  positions: Position[],
  quotes: Record<string, MarketInput | undefined>,
): ValuedPosition[] {
  const valued = positions.map((pos) => {
    const quote = quotes[pos.symbol];
    const price = quote?.price ?? 0;
    const marketValue = quote ? pos.quantity * price : 0;
    const unrealizedPnL = quote ? marketValue - pos.costBasis : 0;
    return {
      ...pos,
      price,
      marketValue,
      unrealizedPnL,
      unrealizedPct: pos.costBasis > 0 && quote ? (unrealizedPnL / pos.costBasis) * 100 : 0,
      dayPnL: quote ? quote.change * pos.quantity : 0,
      weight: 0,
      pending: !quote,
    };
  });

  const total = valued.reduce((sum, p) => sum + p.marketValue, 0);
  for (const p of valued) p.weight = total > 0 ? (p.marketValue / total) * 100 : 0;
  return valued;
}

export function portfolioTotals(valued: ValuedPosition[]): PortfolioTotals {
  const priced = valued.filter((p) => !p.pending);

  const marketValue = sum(priced, (p) => p.marketValue);
  const costBasis = sum(priced, (p) => p.costBasis);
  const unrealizedPnL = sum(priced, (p) => p.unrealizedPnL);
  const dayPnL = sum(priced, (p) => p.dayPnL);
  // Realized P&L is history — it counts even if today's quote hasn't arrived.
  const realizedPnL = sum(valued, (p) => p.realizedPnL);
  const closedCostBasis = sum(valued, (p) => p.closedCostBasis);

  const previousValue = marketValue - dayPnL;
  const deployed = costBasis + closedCostBasis;
  const totalPnL = unrealizedPnL + realizedPnL;

  return {
    marketValue,
    costBasis,
    unrealizedPnL,
    unrealizedPct: costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0,
    realizedPnL,
    dayPnL,
    dayPct: previousValue > 0 ? (dayPnL / previousValue) * 100 : 0,
    totalPnL,
    totalReturnPct: deployed > 0 ? (totalPnL / deployed) * 100 : 0,
  };
}

/** Market value grouped by a key, largest first — the shape both charts take. */
export function groupByValue<K extends string>(
  valued: ValuedPosition[],
  keyOf: (p: ValuedPosition) => K,
): { key: K; value: number; weight: number }[] {
  const totals = new Map<K, number>();
  for (const p of valued) {
    if (p.pending) continue;
    totals.set(keyOf(p), (totals.get(keyOf(p)) ?? 0) + p.marketValue);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([key, value]) => ({ key, value, weight: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

function sum<T>(items: T[], of: (item: T) => number): number {
  return items.reduce((acc, item) => acc + of(item), 0);
}
