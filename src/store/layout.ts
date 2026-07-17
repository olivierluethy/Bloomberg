"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useStoreHydration } from "@/store/hydration";

/**
 * Workspace layout — how the terminal is arranged, not what's in it.
 *
 * Persisted, because a layout you re-drag on every reload isn't a layout. Sizes
 * are keyed by a caller-supplied id rather than by position, so re-ordering
 * panels doesn't shuffle their widths.
 */

interface LayoutState {
  /** Panel id → size in px along its resize axis. */
  panelSizes: Record<string, number>;
  setPanelSize: (id: string, size: number) => void;

  navCollapsed: boolean;
  toggleNav: () => void;
  setNavCollapsed: (collapsed: boolean) => void;

  /** Restores every default without touching watchlists or the portfolio. */
  resetLayout: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      panelSizes: {},
      setPanelSize: (id, size) => set((s) => ({ panelSizes: { ...s.panelSizes, [id]: size } })),

      navCollapsed: false,
      toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
      setNavCollapsed: (navCollapsed) => set({ navCollapsed }),

      resetLayout: () => set({ panelSizes: {}, navCollapsed: false }),
    }),
    {
      name: "term.layout",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ panelSizes: s.panelSizes, navCollapsed: s.navCollapsed }),
      // See store/hydration — rehydrating at creation would contradict the SSR HTML.
      skipHydration: true,
    },
  ),
);

/** True once the persisted layout has rehydrated. */
export function useLayoutHydration(): boolean {
  return useStoreHydration(useLayoutStore);
}

/**
 * A panel's persisted size, falling back to its default until storage answers.
 * Returns the default on the server and the first client render, so the two
 * agree; the saved size lands on the next paint.
 */
export function usePanelSize(id: string | undefined, fallback: number): number {
  const hydrated = useLayoutHydration();
  const saved = useLayoutStore((s) => (id ? s.panelSizes[id] : undefined));
  return hydrated && saved !== undefined ? saved : fallback;
}
