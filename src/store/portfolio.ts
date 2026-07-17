"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useStoreHydration } from "@/store/hydration";
import { buildPositions, type Transaction, type TxSide } from "@/lib/portfolio";

/**
 * The virtual portfolio's ledger.
 *
 * The store holds transactions, never positions: positions are derived by
 * replaying the ledger (see `lib/portfolio`), so there is exactly one source of
 * truth and no way for a stored position to drift out of sync with the trades
 * that produced it.
 */

interface PortfolioState {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  removeTransaction: (id: string) => void;
  /** Units currently held, used to stop the UI creating an unbacked sell. */
  heldQuantity: (symbol: string) => number;
  reset: () => void;
  clear: () => void;
}

/**
 * A seeded ledger so the module opens with something to read. Timestamps are
 * fixed constants rather than dates computed at load: the initial state has to
 * be identical on the server and the client, and it must not drift over time.
 *
 * Costs are deliberately a mix of winners and losers against the simulated
 * quotes, so the P&L colouring is exercised rather than uniformly green.
 */
const DAY = 86_400_000;
const SEED_EPOCH = Date.UTC(2026, 0, 15); // 2026-01-15, fixed

const SAMPLE: Transaction[] = [
  { id: "seed-1", symbol: "AAPL", side: "buy", quantity: 40, price: 182.5, fee: 1, at: SEED_EPOCH },
  { id: "seed-2", symbol: "MSFT", side: "buy", quantity: 15, price: 384.2, fee: 1, at: SEED_EPOCH + 3 * DAY },
  { id: "seed-3", symbol: "NVDA", side: "buy", quantity: 25, price: 612.0, fee: 1, at: SEED_EPOCH + 10 * DAY },
  { id: "seed-4", symbol: "SPY", side: "buy", quantity: 30, price: 521.4, at: SEED_EPOCH + 21 * DAY },
  { id: "seed-5", symbol: "BTC-USD", side: "buy", quantity: 0.75, price: 61200, fee: 12, at: SEED_EPOCH + 30 * DAY },
  { id: "seed-6", symbol: "GC=F", side: "buy", quantity: 8, price: 2180.5, at: SEED_EPOCH + 45 * DAY },
  // A partial exit, so realized P&L and FIFO have something to show.
  { id: "seed-7", symbol: "NVDA", side: "sell", quantity: 10, price: 690.0, fee: 1, at: SEED_EPOCH + 60 * DAY },
  { id: "seed-8", symbol: "AAPL", side: "buy", quantity: 20, price: 210.0, fee: 1, at: SEED_EPOCH + 75 * DAY },
];

/** Client-only: actions never run during SSR, so a time-based id is safe here. */
function newId(): string {
  return `tx_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      transactions: SAMPLE,

      addTransaction: (tx) =>
        set((s) => ({ transactions: [...s.transactions, { ...tx, id: newId() }] })),

      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      heldQuantity: (symbol) =>
        buildPositions(get().transactions).find((p) => p.symbol === symbol)?.quantity ?? 0,

      reset: () => set({ transactions: SAMPLE }),
      clear: () => set({ transactions: [] }),
    }),
    {
      name: "term.portfolio",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ transactions: s.transactions }),
      // See store/hydration — rehydrating at creation would contradict the SSR HTML.
      skipHydration: true,
    },
  ),
);

/** True once the persisted ledger has rehydrated. */
export function usePortfolioHydration(): boolean {
  return useStoreHydration(usePortfolioStore);
}

export type { Transaction, TxSide };
