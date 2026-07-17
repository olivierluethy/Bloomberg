"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { DataCell } from "@/components/primitives/DataCell";
import { Skeleton } from "@/components/primitives/Skeleton";
import { assetClassColor } from "@/config/viz";
import { symbolName } from "@/config/symbols";
import { classifySymbol } from "@/data/provider";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import type { ValuedPosition } from "@/lib/portfolio";

/**
 * The holdings ledger. Per-position weight is an inline meter rather than its
 * own chart: with more than a handful of holdings that all carry meaning, the
 * table IS the right form, and the meter rides along in a column instead of
 * spending a panel on ten slices.
 */

type SortKey = "symbol" | "quantity" | "avgCost" | "price" | "marketValue" | "dayPnL" | "unrealizedPnL" | "weight";

export function HoldingsTable({ valued, pending }: { valued: ValuedPosition[]; pending: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "marketValue", dir: "desc" });
  const openWorkspace = useUIStore((s) => s.openWorkspace);

  const rows = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...valued].sort((a, b) =>
      sort.key === "symbol"
        ? a.symbol.localeCompare(b.symbol) * factor
        : ((a[sort.key] as number) - (b[sort.key] as number)) * factor,
    );
  }, [valued, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "symbol" ? "asc" : "desc" }));

  if (pending) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (valued.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-fg-faint">
        No positions. Use <span className="font-mono text-fg-dim">TRADE</span> to open one.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-panel">
        <tr className="border-b border-line">
          <Th label="Symbol" col="symbol" sort={sort} onSort={toggle} align="left" />
          <Th label="Qty" col="quantity" sort={sort} onSort={toggle} />
          <Th label="Avg Cost" col="avgCost" sort={sort} onSort={toggle} />
          <Th label="Last" col="price" sort={sort} onSort={toggle} />
          <Th label="Mkt Value" col="marketValue" sort={sort} onSort={toggle} />
          <Th label="Day P&L" col="dayPnL" sort={sort} onSort={toggle} />
          <Th label="Unreal P&L" col="unrealizedPnL" sort={sort} onSort={toggle} />
          <Th label="Weight" col="weight" sort={sort} onSort={toggle} />
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <Row key={p.symbol} p={p} onOpen={() => openWorkspace(p.symbol)} />
        ))}
      </tbody>
    </table>
  );
}

function Row({ p, onOpen }: { p: ValuedPosition; onOpen: () => void }) {
  const cls = classifySymbol(p.symbol);
  const digits = cls === "forex" ? 4 : 2;

  return (
    <tr className="group border-b border-line last:border-0 hover:bg-elevated">
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0" style={{ background: assetClassColor(cls) }} aria-hidden />
          <button
            type="button"
            onClick={onOpen}
            className="font-mono text-sm font-medium text-fg transition-colors hover:text-amber"
            title={`Open ${p.symbol} workspace`}
          >
            {p.symbol}
          </button>
          <span className="hidden truncate text-2xs text-fg-faint lg:inline">{symbolName(p.symbol)}</span>
        </div>
      </td>
      <Num>{trimQty(p.quantity)}</Num>
      <Num>{formatPrice(p.avgCost, digits)}</Num>
      <td className="px-3 py-1.5 text-right">
        {p.pending ? (
          <Skeleton className="ml-auto h-3 w-14" />
        ) : (
          <DataCell value={p.price} display={formatPrice(p.price, digits)} color="none" className="px-0 text-fg" />
        )}
      </td>
      <Num>{p.pending ? "—" : formatPrice(p.marketValue)}</Num>
      <td className="px-3 py-1.5 text-right">
        {p.pending ? "—" : <DataCell value={p.dayPnL} display={formatSigned(p.dayPnL)} color={p.dayPnL >= 0 ? "up" : "down"} className="px-0" />}
      </td>
      <td className="px-3 py-1.5 text-right">
        {p.pending ? (
          "—"
        ) : (
          <div className="flex items-baseline justify-end gap-2">
            <DataCell
              value={p.unrealizedPnL}
              display={formatSigned(p.unrealizedPnL)}
              color={p.unrealizedPnL >= 0 ? "up" : "down"}
              className="px-0"
            />
            <span className={cn("font-mono text-2xs tabular-nums", p.unrealizedPnL >= 0 ? "text-up/70" : "text-down/70")}>
              {formatPercent(p.unrealizedPct)}
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-1.5">
        <WeightMeter weight={p.weight} />
      </td>
    </tr>
  );
}

/** Share of the portfolio as a track + fill, with the number beside it. */
function WeightMeter({ weight }: { weight: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-14 bg-elevated" aria-hidden>
        <div className="h-full bg-line-bright" style={{ width: `${Math.min(100, weight)}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-2xs tabular-nums text-fg-dim">{weight.toFixed(1)}%</span>
    </div>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-1.5 text-right font-mono text-sm tabular-nums text-fg-dim">{children}</td>;
}

/** Whole units shouldn't render as 0.75-style decimals; fractional ones must. */
function trimQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(4).replace(/0+$/, "");
}

function Th({
  label,
  col,
  sort,
  onSort,
  align = "right",
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === col;
  return (
    <th
      className={cn("px-3 py-1.5 font-normal", align === "right" ? "text-right" : "text-left")}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn("eyebrow inline-flex items-center gap-1 transition-colors hover:text-fg-dim", active && "text-amber")}
      >
        {label}
        <span className="w-2 font-mono text-2xs" aria-hidden>
          {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}
