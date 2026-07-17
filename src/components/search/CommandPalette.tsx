"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/primitives/Modal";
import { cn } from "@/lib/cn";
import {
  buildItems,
  filterItems,
  groupRanked,
  type PaletteItem,
  type RankedItem,
} from "@/components/search/palette-items";
import { useUIStore } from "@/store/ui";
import { useActiveWatchlist, useWatchlistHydration, useWatchlistStore } from "@/store/watchlists";

/**
 * The ⌘K command palette — the keyboard spine of the terminal.
 *
 * Searches the local symbol catalog, every module, and the watchlist commands.
 * Matching is local and synchronous (see `lib/fuzzy`), so results land on the
 * keystroke rather than after a rate-limited round-trip.
 */
export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen);
  const seq = useUIStore((s) => s.paletteSeq);
  const closePalette = useUIStore((s) => s.closePalette);
  const togglePalette = useUIStore((s) => s.togglePalette);
  const hydrated = useWatchlistHydration();

  useGlobalShortcut(togglePalette);

  // Body state (query, cursor) lives one level down and is keyed by the open
  // counter, so every ⌘K starts from a clean prompt — including a reopen that
  // interrupts the close animation, which would otherwise reuse the old body.
  // Waiting on hydration keeps pinned state honest from the first paint.
  return (
    <Modal
      open={open && hydrated}
      onClose={closePalette}
      align="top"
      label="Command palette"
      className="max-w-2xl"
    >
      <PaletteBody key={seq} onClose={closePalette} />
    </Modal>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const openModal = useUIStore((s) => s.openModal);
  const openWorkspace = useUIStore((s) => s.openWorkspace);

  const lists = useWatchlistStore((s) => s.lists);
  const activeList = useActiveWatchlist();
  const toggleSymbol = useWatchlistStore((s) => s.toggleSymbol);
  const setActive = useWatchlistStore((s) => s.setActive);
  const createList = useWatchlistStore((s) => s.createList);

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      buildItems({
        lists,
        activeList,
        isDev: process.env.NODE_ENV !== "production",
        navigate: (href) => router.push(href),
        openWorkspace,
        togglePin: (symbol) => {
          if (activeList) toggleSymbol(activeList.id, symbol);
        },
        setActiveList: setActive,
        openManager: () => openModal("watchlists"),
        createList: () => {
          createList("New list");
          openModal("watchlists");
        },
      }),
    [lists, activeList, router, openWorkspace, toggleSymbol, setActive, createList, openModal],
  );

  const ranked = useMemo(() => filterItems(items, query), [items, query]);
  const groups = useMemo(() => groupRanked(ranked), [ranked]);

  // Clamp while rendering rather than correcting the cursor from an effect: a
  // shrinking result set must never point past the end.
  const activeIndex = ranked.length ? Math.min(cursor, ranked.length - 1) : 0;

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, ranked.length]);

  const runItem = (item: PaletteItem, alt: boolean) => {
    if (alt && item.runAlt) {
      item.runAlt();
      // A symbol's alternate action is pin/unpin — a toggle you often repeat, so
      // the palette stays up and the row's star flips in place.
      if (item.group !== "Symbols") onClose();
      return;
    }
    // Every primary action is a jump (workspace, module, modal), so it closes.
    item.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setCursor(ranked.length ? (activeIndex + 1) % ranked.length : 0);
    } else if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setCursor(ranked.length ? (activeIndex - 1 + ranked.length) % ranked.length : 0);
    } else if (e.key === "Home") {
      e.preventDefault();
      setCursor(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setCursor(Math.max(0, ranked.length - 1));
    } else if (e.key === "Enter") {
      const entry = ranked[activeIndex];
      if (entry) {
        e.preventDefault();
        runItem(entry.item, e.metaKey || e.ctrlKey);
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="font-mono text-sm text-amber" aria-hidden>
          {">"}
        </span>
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search symbols, jump to a module, run a command…"
          className="flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-faint"
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={ranked[activeIndex] ? `palette-${ranked[activeIndex].item.id}` : undefined}
          aria-autocomplete="list"
          aria-label="Search symbols and commands"
        />
        <kbd className="hidden border border-line px-1.5 py-0.5 font-mono text-2xs text-fg-dim sm:inline">
          ESC
        </kbd>
      </div>

      <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto py-1">
        {ranked.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-fg-faint">
            No matches for <span className="font-mono text-fg-dim">{query}</span>
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.group} className="mb-1">
              <div className="eyebrow px-3 py-1.5">{group.group}</div>
              {group.items.map((entry) => (
                <Row
                  key={entry.item.id}
                  entry={entry}
                  active={ranked[activeIndex]?.item.id === entry.item.id}
                  onHover={() => setCursor(ranked.indexOf(entry))}
                  onSelect={(alt) => runItem(entry.item, alt)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <Footer activeItem={ranked[activeIndex]?.item} activeListName={activeList?.name} />
    </>
  );
}

function Row({
  entry,
  active,
  onHover,
  onSelect,
}: {
  entry: RankedItem;
  active: boolean;
  onHover: () => void;
  onSelect: (alt: boolean) => void;
}) {
  const { item, indices } = entry;
  return (
    <div
      id={`palette-${item.id}`}
      role="option"
      aria-selected={active}
      data-active={active}
      onMouseMove={onHover}
      onClick={(e) => onSelect(e.metaKey || e.ctrlKey)}
      className={cn(
        "flex cursor-pointer items-center gap-3 border-l-2 px-3 py-1.5 transition-colors",
        active ? "border-amber bg-elevated" : "border-transparent",
      )}
    >
      {item.group === "Symbols" && (
        <span
          className={cn("w-3 shrink-0 text-center font-mono text-sm", item.pinned ? "text-amber" : "text-fg-faint")}
          aria-hidden
        >
          {item.pinned ? "★" : "☆"}
        </span>
      )}
      <span className={cn("shrink-0 font-mono text-sm font-medium", active ? "text-fg" : "text-fg")}>
        <Highlight text={item.title} indices={indices} />
      </span>
      {item.subtitle && <span className="min-w-0 flex-1 truncate text-sm text-fg-dim">{item.subtitle}</span>}
      {item.tag && (
        <span className="ml-auto shrink-0 font-mono text-2xs font-bold tracking-wide text-fg-faint">{item.tag}</span>
      )}
    </div>
  );
}

/** Renders matched characters in amber so the ranking is legible. */
function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={i} className={set.has(i) ? "text-amber" : undefined}>
          {char}
        </span>
      ))}
    </>
  );
}

function Footer({ activeItem, activeListName }: { activeItem?: PaletteItem; activeListName?: string }) {
  const isSymbol = activeItem?.group === "Symbols";
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-line px-3 py-1.5 text-2xs text-fg-faint">
      <Hint keys="↑↓" label="Navigate" />
      <Hint keys="⏎" label={isSymbol ? "Open workspace" : "Run"} />
      {isSymbol && (
        <Hint
          keys="⌘⏎"
          label={`${activeItem?.pinned ? "Unpin from" : "Pin to"} ${activeListName ?? "watchlist"}`}
        />
      )}
      <span className="ml-auto font-mono tracking-wide">TERM</span>
    </div>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="border border-line px-1 py-0.5 font-mono text-2xs text-fg-dim">{keys}</kbd>
      <span className="truncate">{label}</span>
    </span>
  );
}

/** ⌘K / Ctrl+K from anywhere, including while an input has focus. */
function useGlobalShortcut(toggle: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
}
