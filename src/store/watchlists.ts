"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useSyncExternalStore } from "react";
import { MARKETS_WATCHLIST } from "@/config/universes";

/**
 * Watchlists — local truth, so Zustand owns it (never TanStack Query, which owns
 * only fetched data). Persisted to localStorage: a terminal that forgets your
 * pinned symbols on reload isn't a terminal.
 */

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

interface WatchlistState {
  lists: Watchlist[];
  activeId: string;

  setActive: (id: string) => void;
  createList: (name: string, symbols?: string[]) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  reorderLists: (from: number, to: number) => void;

  addSymbol: (listId: string, symbol: string) => void;
  removeSymbol: (listId: string, symbol: string) => void;
  toggleSymbol: (listId: string, symbol: string) => void;
  moveSymbol: (listId: string, from: number, to: number) => void;
}

const DEFAULT_LIST_ID = "default";

function initialLists(): Watchlist[] {
  return [{ id: DEFAULT_LIST_ID, name: "Markets", symbols: [...MARKETS_WATCHLIST] }];
}

/** Client-only: actions never run during SSR, so a time-based id is safe here. */
function newId(): string {
  return `wl_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** Immutably move an item between indices, clamping out-of-range callers. */
function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const target = Math.max(0, Math.min(to, items.length - 1));
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(target, 0, moved);
  return next;
}

function updateList(
  lists: Watchlist[],
  id: string,
  fn: (list: Watchlist) => Watchlist,
): Watchlist[] {
  return lists.map((list) => (list.id === id ? fn(list) : list));
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      lists: initialLists(),
      activeId: DEFAULT_LIST_ID,

      setActive: (id) => set({ activeId: id }),

      createList: (name, symbols = []) => {
        const id = newId();
        const trimmed = name.trim() || "Untitled";
        set((s) => ({ lists: [...s.lists, { id, name: trimmed, symbols }], activeId: id }));
        return id;
      },

      renameList: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({ lists: updateList(s.lists, id, (l) => ({ ...l, name: trimmed })) }));
      },

      deleteList: (id) => {
        const { lists, activeId } = get();
        // Always keep one list so the panel never renders an empty shell.
        if (lists.length <= 1) return;
        const next = lists.filter((l) => l.id !== id);
        set({
          lists: next,
          activeId: activeId === id ? (next[0]?.id ?? DEFAULT_LIST_ID) : activeId,
        });
      },

      reorderLists: (from, to) => set((s) => ({ lists: moveItem(s.lists, from, to) })),

      addSymbol: (listId, symbol) =>
        set((s) => ({
          lists: updateList(s.lists, listId, (l) =>
            l.symbols.includes(symbol) ? l : { ...l, symbols: [...l.symbols, symbol] },
          ),
        })),

      removeSymbol: (listId, symbol) =>
        set((s) => ({
          lists: updateList(s.lists, listId, (l) => ({
            ...l,
            symbols: l.symbols.filter((x) => x !== symbol),
          })),
        })),

      toggleSymbol: (listId, symbol) => {
        const list = get().lists.find((l) => l.id === listId);
        if (!list) return;
        if (list.symbols.includes(symbol)) get().removeSymbol(listId, symbol);
        else get().addSymbol(listId, symbol);
      },

      moveSymbol: (listId, from, to) =>
        set((s) => ({
          lists: updateList(s.lists, listId, (l) => ({ ...l, symbols: moveItem(l.symbols, from, to) })),
        })),
    }),
    {
      name: "term.watchlists",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lists: s.lists, activeId: s.activeId }),
      // Hydrate explicitly from an effect instead of at store creation: an
      // automatic rehydrate would make the first client render disagree with the
      // server HTML for anyone who has saved lists.
      skipHydration: true,
    },
  ),
);

/**
 * Rehydrates the persisted store on mount and reports when it's safe to render
 * user data. Components show a skeleton until this flips true, which keeps the
 * server render and the first client render identical.
 *
 * Hydration is external state, so it's read through `useSyncExternalStore`
 * rather than mirrored into local state from an effect. The server snapshot is
 * always false, which is what makes the two first renders agree.
 */
export function useWatchlistHydration(): boolean {
  useEffect(() => {
    // No-op if an earlier mount already rehydrated (e.g. a second panel).
    if (!useWatchlistStore.persist.hasHydrated()) {
      void useWatchlistStore.persist.rehydrate();
    }
  }, []);

  return useSyncExternalStore(subscribeToHydration, getHydrated, getServerHydrated);
}

function subscribeToHydration(onChange: () => void): () => void {
  return useWatchlistStore.persist.onFinishHydration(onChange);
}

function getHydrated(): boolean {
  return useWatchlistStore.persist.hasHydrated();
}

function getServerHydrated(): boolean {
  return false;
}

/** The active list, or the first one if a stale id was persisted. */
export function useActiveWatchlist(): Watchlist | undefined {
  return useWatchlistStore((s) => s.lists.find((l) => l.id === s.activeId) ?? s.lists[0]);
}
