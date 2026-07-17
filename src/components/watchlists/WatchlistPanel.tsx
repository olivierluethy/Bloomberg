"use client";

import { Panel } from "@/components/primitives/Panel";
import { Skeleton } from "@/components/primitives/Skeleton";
import { AssetTable } from "@/components/modules/AssetTable";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/store/ui";
import { useActiveWatchlist, useWatchlistHydration, useWatchlistStore } from "@/store/watchlists";

/**
 * The watchlist panel: a tab per list, the active list's quotes below.
 *
 * Symbols come from the persisted store rather than a hard-coded universe, so
 * whatever you pin with ⌘K shows up here and survives a reload.
 */
export function WatchlistPanel({ className }: { className?: string }) {
  const hydrated = useWatchlistHydration();
  const lists = useWatchlistStore((s) => s.lists);
  const setActive = useWatchlistStore((s) => s.setActive);
  const active = useActiveWatchlist();
  const openModal = useUIStore((s) => s.openModal);
  const openPalette = useUIStore((s) => s.openPalette);

  return (
    <Panel
      tag="1"
      title="Watchlist"
      eyebrow="Pinned"
      className={cn("h-full", className)}
      scroll
      actions={
        <button
          type="button"
          onClick={() => openModal("watchlists")}
          // Sits on the blue header bar, so it takes the bar's own ink rather
          // than the body grey — grey on blue was the one contrast failure here
          // that wasn't a deliberate choice.
          className="border border-black px-1 text-2xs font-bold text-amber2 transition-colors hover:bg-amber2 hover:text-black"
        >
          EDIT
        </button>
      }
    >
      {/* Until the persisted store rehydrates, the server and client must agree. */}
      {!hydrated ? (
        <div className="flex flex-col gap-2 p-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <>
          {lists.length > 1 && (
            <div role="tablist" aria-label="Watchlists" className="flex shrink-0 overflow-x-auto border-b border-line">
              {lists.map((list) => (
                <button
                  key={list.id}
                  role="tab"
                  aria-selected={list.id === active?.id}
                  onClick={() => setActive(list.id)}
                  className={cn(
                    "shrink-0 border-b-2 px-2.5 py-0.5 text-sm transition-colors",
                    list.id === active?.id
                      ? "border-amber text-fg"
                      : "border-transparent text-fg-dim hover:bg-elevated hover:text-fg",
                  )}
                >
                  {list.name}
                  <span className="ml-1.5 font-mono text-2xs text-fg-faint">{list.symbols.length}</span>
                </button>
              ))}
            </div>
          )}

          {active && active.symbols.length > 0 ? (
            <AssetTable symbols={active.symbols} showVolume={false} pinnable />
          ) : (
            <div className="flex flex-col items-center gap-2 px-1.5 py-10 text-center">
              <p className="text-2xs text-fg-dim">This list is empty.</p>
              <button
                type="button"
                onClick={openPalette}
                className="border border-line px-1.5 py-1 font-mono text-2xs text-amber transition-colors hover:border-amber/60"
              >
                ⌘K — FIND SYMBOLS
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
