"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { DataCell } from "@/components/primitives/DataCell";
import { SourceTag } from "@/components/primitives/SourceTag";
import { Sparkline } from "@/components/primitives/Sparkline";
import { Skeleton } from "@/components/primitives/Skeleton";
import { useOHLCV, useQuotes } from "@/data/hooks";
import { classifySymbol } from "@/data/provider";
import { formatCompact, formatPercent, formatPrice, formatSigned } from "@/lib/format";
import { useActiveWatchlist, useWatchlistHydration, useWatchlistStore } from "@/store/watchlists";
import { useUIStore } from "@/store/ui";
import type { Provenance, Quote } from "@/data/types";

type SortKey = "symbol" | "price" | "change" | "changePercent" | "volume";
type SortDir = "asc" | "desc";

interface Row {
  symbol: string;
  quote?: Quote;
  source?: Provenance;
  provider?: string;
  pending: boolean;
}

function priceDigits(symbol: string, price: number | undefined): number {
  const cls = classifySymbol(symbol);
  if (cls === "forex") return 4;
  if (cls === "bond") return 3;
  return price !== undefined && price < 10 ? 4 : 2;
}

/**
 * Sortable quote list shared by every asset-class panel. Loads quotes in a
 * batch, shows skeleton rows for anything still pending, and renders a per-row
 * sparkline. Click a header to sort; pending rows always sink to the bottom.
 */
export function AssetTable({
  symbols,
  showVolume = true,
  limit,
  defaultSort,
  pinnable = false,
}: {
  symbols: string[];
  showVolume?: boolean;
  /** Render only the first N rows after sorting (e.g. top movers). */
  limit?: number;
  defaultSort?: { key: SortKey; dir: SortDir };
  /** Show a star toggle that pins each row to the active watchlist. */
  pinnable?: boolean;
}) {
  const results = useQuotes(symbols);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>(defaultSort ?? { key: "symbol", dir: "asc" });

  // Pin state comes from the persisted store, so the stars stay hidden until it
  // has rehydrated — otherwise the first client render would contradict the
  // server HTML for anyone with saved lists.
  const hydrated = useWatchlistHydration();
  const activeList = useActiveWatchlist();
  const toggleSymbol = useWatchlistStore((s) => s.toggleSymbol);
  const showPins = pinnable && hydrated && Boolean(activeList);
  const pinned = useMemo(() => new Set(activeList?.symbols ?? []), [activeList]);

  const rows: Row[] = useMemo(
    () =>
      symbols.map((symbol, i) => {
        const r = results[i];
        return {
          symbol,
          quote: r?.data?.data,
          source: r?.data?.source,
          provider: r?.data?.provider,
          pending: r?.isPending ?? true,
        };
      }),
    [symbols, results],
  );

  const sorted = useMemo(() => {
    const loaded = rows.filter((r) => r.quote);
    const pending = rows.filter((r) => !r.quote);
    const factor = sort.dir === "asc" ? 1 : -1;
    loaded.sort((a, b) => {
      if (sort.key === "symbol") return a.symbol.localeCompare(b.symbol) * factor;
      const av = valueOf(a.quote!, sort.key);
      const bv = valueOf(b.quote!, sort.key);
      return (av - bv) * factor;
    });
    const all = [...loaded, ...pending];
    return limit ? all.slice(0, limit) : all;
  }, [rows, sort, limit]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "symbol" ? "asc" : "desc" },
    );

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-panel">
        <tr className="border-b border-line text-fg-faint">
          <Th label="Symbol" col="symbol" sort={sort} onSort={toggleSort} align="left" />
          <Th label="Last" col="price" sort={sort} onSort={toggleSort} align="right" />
          <Th label="Chg" col="change" sort={sort} onSort={toggleSort} align="right" />
          <Th label="Chg%" col="changePercent" sort={sort} onSort={toggleSort} align="right" />
          <th className="px-3 py-1.5 text-right font-normal">
            <span className="eyebrow">Trend</span>
          </th>
          {showVolume && <Th label="Volume" col="volume" sort={sort} onSort={toggleSort} align="right" />}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) =>
          row.quote ? (
            <QuoteRow
              key={row.symbol}
              row={row}
              showVolume={showVolume}
              showPin={showPins}
              pinned={pinned.has(row.symbol)}
              onTogglePin={() => activeList && toggleSymbol(activeList.id, row.symbol)}
            />
          ) : (
            <SkeletonRow key={row.symbol} symbol={row.symbol} showVolume={showVolume} showPin={showPins} />
          ),
        )}
      </tbody>
    </table>
  );
}

function valueOf(q: Quote, key: SortKey): number {
  switch (key) {
    case "price":
      return q.price;
    case "change":
      return q.change;
    case "changePercent":
      return q.changePercent;
    case "volume":
      return q.volume ?? 0;
    default:
      return 0;
  }
}

function Th({
  label,
  col,
  sort,
  onSort,
  align,
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  align: "left" | "right";
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
        className={cn(
          "eyebrow inline-flex items-center gap-1 transition-colors hover:text-fg-dim",
          active && "text-amber",
        )}
      >
        {label}
        <span className="w-2 font-mono text-2xs" aria-hidden>
          {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

function QuoteRow({
  row,
  showVolume,
  showPin,
  pinned,
  onTogglePin,
}: {
  row: Row;
  showVolume: boolean;
  showPin: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const openWorkspace = useUIStore((s) => s.openWorkspace);
  const q = row.quote!;
  const dir = q.changePercent >= 0 ? "up" : "down";
  const digits = priceDigits(row.symbol, q.price);
  return (
    <tr className="group border-b border-line last:border-0 hover:bg-elevated">
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          {showPin && <PinButton symbol={row.symbol} pinned={pinned} onToggle={onTogglePin} />}
          <button
            type="button"
            onClick={() => openWorkspace(row.symbol)}
            className="font-mono text-sm font-medium text-fg transition-colors hover:text-amber"
            title={`Open ${row.symbol} workspace`}
          >
            {row.symbol}
          </button>
          <SourceTag source={row.source} provider={row.provider} className="opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </td>
      <td className="py-1.5 text-right">
        <DataCell value={q.price} display={formatPrice(q.price, digits)} color="none" className="text-fg" />
      </td>
      <td className="py-1.5 text-right">
        <DataCell value={q.change} display={formatSigned(q.change, digits)} color={dir} />
      </td>
      <td className="py-1.5 text-right">
        <DataCell value={q.changePercent} display={formatPercent(q.changePercent)} color={dir} />
      </td>
      <td className="py-1.5 pl-3 pr-3 text-right">
        <div className="flex justify-end">
          <RowSparkline symbol={row.symbol} dir={dir} />
        </div>
      </td>
      {showVolume && (
        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-fg-dim">
          {q.volume ? formatCompact(q.volume) : "—"}
        </td>
      )}
    </tr>
  );
}

/**
 * Star toggle. Unpinned stars stay dim until row hover or keyboard focus so the
 * table reads as data first, controls second.
 */
function PinButton({ symbol, pinned, onToggle }: { symbol: string; pinned: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${symbol} from watchlist` : `Pin ${symbol} to watchlist`}
      title={pinned ? "Unpin from watchlist" : "Pin to watchlist"}
      className={cn(
        "font-mono text-sm leading-none transition-all",
        pinned
          ? "text-amber"
          : "text-fg-faint opacity-0 hover:text-fg-dim focus-visible:opacity-100 group-hover:opacity-100",
      )}
    >
      <span aria-hidden>{pinned ? "★" : "☆"}</span>
    </button>
  );
}

function SkeletonRow({ symbol, showVolume, showPin }: { symbol: string; showVolume: boolean; showPin: boolean }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          {/* Reserve the star's width so rows don't shift as quotes land. */}
          {showPin && <span className="w-3.5" aria-hidden />}
          <span className="font-mono text-sm text-fg-faint">{symbol}</span>
        </div>
      </td>
      <td className="py-1.5"><Skeleton className="ml-auto h-3 w-14" /></td>
      <td className="py-1.5"><Skeleton className="ml-auto h-3 w-12" /></td>
      <td className="py-1.5"><Skeleton className="ml-auto h-3 w-12" /></td>
      <td className="px-3 py-1.5"><Skeleton className="ml-auto h-4 w-16" /></td>
      {showVolume && <td className="px-3 py-1.5"><Skeleton className="ml-auto h-3 w-12" /></td>}
    </tr>
  );
}

/** Fetches a short OHLCV series and renders it as a colored sparkline. */
function RowSparkline({ symbol, dir }: { symbol: string; dir: "up" | "down" }) {
  const { data, isPending } = useOHLCV(symbol, "1M", "1day");
  if (isPending) return <Skeleton className="h-4 w-16" />;
  const closes = data?.data.map((c) => c.close) ?? [];
  return <Sparkline data={closes} className={dir === "up" ? "text-up" : "text-down"} />;
}
