"use client";

import { Modal } from "@/components/primitives/Modal";
import { DataCell } from "@/components/primitives/DataCell";
import { SourceTag } from "@/components/primitives/SourceTag";
import { Skeleton } from "@/components/primitives/Skeleton";
import { PriceChart } from "@/components/charts/PriceChart";
import { NewsFeed } from "@/components/modules/NewsFeed";
import { KeyStats } from "@/components/workspace/KeyStats";
import { DetailTabs } from "@/components/workspace/DetailTabs";
import { cn } from "@/lib/cn";
import { symbolName } from "@/config/symbols";
import { useQuote } from "@/data/hooks";
import { classifySymbol } from "@/data/provider";
import { formatPercent, formatPrice, formatSigned, priceDigits } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import { useActiveWatchlist, useWatchlistStore } from "@/store/watchlists";

/**
 * The asset-detail workspace: everything the terminal knows about one symbol,
 * as an overlay rather than a route.
 *
 * An overlay because it's a drill-down, not a destination — it opens over
 * whatever you were reading, and Escape puts you back exactly where you were.
 * Nothing here fetches directly: the chart, news, stats, and detail tabs each
 * subscribe through the Phase 2 hooks, so the same cached quote powers the
 * header and the panel behind it.
 */
export function AssetWorkspace() {
  const symbol = useUIStore((s) => s.workspaceSymbol);
  const seq = useUIStore((s) => s.workspaceSeq);
  const close = useUIStore((s) => s.closeWorkspace);

  return (
    <Modal
      open={Boolean(symbol)}
      onClose={close}
      labelledBy="workspace-symbol"
      className="h-[88vh] max-w-6xl"
    >
      {/* Keyed per open so the chart/tab state never leaks between symbols. */}
      {symbol ? <WorkspaceBody key={`${seq}:${symbol}`} symbol={symbol} onClose={close} /> : null}
    </Modal>
  );
}

function WorkspaceBody({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  return (
    <>
      <WorkspaceHeader symbol={symbol} onClose={onClose} />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col border-b border-line lg:border-b-0 lg:border-r">
          <div className="min-h-0 flex-[3]">
            <PriceChart symbol={symbol} />
          </div>
          <div className="flex min-h-0 flex-[2] flex-col border-t border-line">
            <DetailTabs symbol={symbol} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto">
          <KeyStats symbol={symbol} />
          <div className="flex min-h-0 flex-1 flex-col border-t border-line">
            <h3 className="eyebrow shrink-0 px-1.5 py-0.5">Related News</h3>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NewsFeed symbol={symbol} compact limit={8} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function WorkspaceHeader({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const { data, isPending } = useQuote(symbol);
  const quote = data?.data;

  const activeList = useActiveWatchlist();
  const toggleSymbol = useWatchlistStore((s) => s.toggleSymbol);
  const pinned = Boolean(activeList?.symbols.includes(symbol));

  const cls = classifySymbol(symbol);
  const digits = priceDigits(symbol, quote?.price);
  const dir = quote && quote.changePercent >= 0 ? "up" : "down";

  return (
    <header className="flex shrink-0 items-center gap-1.5 border-b border-line px-1.5 py-0.5">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          <h2 id="workspace-symbol" className="font-mono text-sm font-bold text-fg">
            {symbol}
          </h2>
          <span className="font-mono text-2xs font-bold uppercase tracking-wide text-fg-faint">{cls}</span>
          <SourceTag source={data?.source} provider={data?.provider} />
        </div>
        <p className="truncate text-xs text-fg-dim">{symbolName(symbol)}</p>
      </div>

      {isPending || !quote ? (
        <Skeleton className="h-6 w-40" />
      ) : (
        <div className="flex items-baseline gap-2">
          <DataCell
            value={quote.price}
            display={formatPrice(quote.price, digits)}
            color="none"
            className="px-0 text-sm font-bold text-fg"
          />
          <DataCell value={quote.change} display={formatSigned(quote.change, digits)} color={dir} className="px-0 text-sm" />
          <DataCell
            value={quote.changePercent}
            display={formatPercent(quote.changePercent)}
            color={dir}
            className="px-0 text-sm"
          />
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => activeList && toggleSymbol(activeList.id, symbol)}
          aria-pressed={pinned}
          className={cn(
            "border px-1.5 py-1 font-mono text-2xs transition-colors",
            pinned ? "border-amber/60 text-amber" : "border-line text-fg-dim hover:border-line-bright hover:text-fg",
          )}
        >
          {pinned ? "★ PINNED" : "☆ PIN"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-1.5 py-1 font-mono text-2xs text-fg-dim transition-colors hover:border-line-bright hover:text-fg"
        >
          ESC
        </button>
      </div>
    </header>
  );
}
