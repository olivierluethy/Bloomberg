"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/Modal";
import { cn } from "@/lib/cn";
import { SYMBOL_CATALOG } from "@/config/symbols";
import { useQuote } from "@/data/hooks";
import { formatPrice } from "@/lib/format";
import { useIsModalOpen, useUIStore } from "@/store/ui";
import { usePortfolioHydration, usePortfolioStore } from "@/store/portfolio";
import type { TxSide } from "@/lib/portfolio";

/**
 * Records a trade against the ledger.
 *
 * The long-only rule lives in the math, but it's enforced here too: the form
 * won't submit a sell larger than the units held, so the ledger never carries an
 * entry the model would have to silently drop.
 */
export function TradeModal() {
  const open = useIsModalOpen("trade");
  const seq = useUIStore((s) => s.modalSeq);
  const closeModal = useUIStore((s) => s.closeModal);
  const hydrated = usePortfolioHydration();

  return (
    <Modal open={open && hydrated} onClose={closeModal} labelledBy="trade-title" className="max-w-md">
      <TradeForm key={seq} onClose={closeModal} />
    </Modal>
  );
}

function TradeForm({ onClose }: { onClose: () => void }) {
  const addTransaction = usePortfolioStore((s) => s.addTransaction);
  const heldQuantity = usePortfolioStore((s) => s.heldQuantity);

  const [side, setSide] = useState<TxSide>("buy");
  const [symbol, setSymbol] = useState("AAPL");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");

  const { data } = useQuote(symbol);
  const last = data?.data.price;
  const held = heldQuantity(symbol);

  const qty = Number(quantity);
  // An empty price means "fill at the last quote" — the terminal already knows it.
  const px = price.trim() === "" ? (last ?? 0) : Number(price);

  const problem =
    !Number.isFinite(qty) || qty <= 0
      ? "Quantity must be greater than zero."
      : !Number.isFinite(px) || px <= 0
        ? "Enter a price, or wait for the quote to load."
        : side === "sell" && qty > held
          ? `You hold ${held} ${symbol}. This portfolio is long-only.`
          : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) return;
    addTransaction({
      symbol,
      side,
      quantity: qty,
      price: px,
      fee: fee.trim() === "" ? undefined : Number(fee),
      at: Date.now(),
    });
    onClose();
  };

  return (
    <form onSubmit={submit}>
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex flex-col">
          <span className="eyebrow">Portfolio</span>
          <h2 id="trade-title" className="text-sm font-semibold text-fg">
            Record a Trade
          </h2>
        </div>
        <div className="flex" role="group" aria-label="Side">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={cn(
                "border px-2.5 py-1 font-mono text-2xs font-semibold uppercase transition-colors",
                side === s
                  ? s === "buy"
                    ? "border-up/60 bg-up/10 text-up"
                    : "border-down/60 bg-down/10 text-down"
                  : "border-line text-fg-dim hover:text-fg",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3 p-3">
        <Field label="Symbol">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full border border-line bg-void px-2 py-1 font-mono text-sm text-fg outline-none focus:border-line-bright"
          >
            {SYMBOL_CATALOG.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} — {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 font-mono text-2xs text-fg-faint">
            Held: {held} · Last: {last !== undefined ? formatPrice(last) : "…"}
          </p>
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Quantity">
            <Input value={quantity} onChange={setQuantity} inputMode="decimal" />
          </Field>
          <Field label="Price">
            <Input value={price} onChange={setPrice} inputMode="decimal" placeholder={last ? formatPrice(last) : "last"} />
          </Field>
          <Field label="Fee">
            <Input value={fee} onChange={setFee} inputMode="decimal" placeholder="0" />
          </Field>
        </div>

        <div className="flex items-baseline justify-between border border-line bg-void px-2 py-1.5">
          <span className="eyebrow">Est. {side === "buy" ? "Cost" : "Proceeds"}</span>
          <span className="font-mono text-sm tabular-nums text-fg">
            {Number.isFinite(qty) && Number.isFinite(px) && qty > 0 && px > 0
              ? formatPrice(qty * px + (side === "buy" ? Number(fee || 0) : -Number(fee || 0)))
              : "—"}
          </span>
        </div>

        {problem ? <p className="font-mono text-2xs text-down">{problem}</p> : null}
      </div>

      <footer className="flex justify-end gap-2 border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-2.5 py-1 font-mono text-2xs text-fg-dim transition-colors hover:border-line-bright hover:text-fg"
        >
          CANCEL
        </button>
        <button
          type="submit"
          disabled={Boolean(problem)}
          className={cn(
            "border px-2.5 py-1 font-mono text-2xs font-semibold uppercase transition-colors",
            problem
              ? "cursor-not-allowed border-line text-fg-faint/40"
              : "border-amber/60 text-amber hover:bg-amber/10",
          )}
        >
          Record {side}
        </button>
      </footer>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "decimal";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full border border-line bg-void px-2 py-1 font-mono text-sm text-fg outline-none focus:border-line-bright placeholder:text-fg-faint"
    />
  );
}
