"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Shared rehydration for persisted Zustand stores.
 *
 * Every persisted store skips automatic hydration, because rehydrating at store
 * creation would make the first client render disagree with the server HTML for
 * anyone who has saved state. Instead each store rehydrates from an effect and
 * panels render a skeleton until it lands.
 *
 * Hydration is external state, so it's read through `useSyncExternalStore`
 * rather than mirrored into local state from an effect. The server snapshot is
 * always false, which is what makes the two first renders agree.
 */

/** The slice of Zustand's persist API this needs — structural, so any store fits. */
interface PersistedStore {
  persist: {
    hasHydrated: () => boolean;
    rehydrate: () => Promise<void> | void;
    onFinishHydration: (fn: () => void) => () => void;
  };
}

const serverSnapshot = () => false;

/**
 * Returns true once `store` has rehydrated from storage, kicking off the
 * rehydration on first mount. Safe to call from several components at once —
 * whichever mounts first triggers it, the rest just subscribe.
 */
export function useStoreHydration(store: PersistedStore): boolean {
  useEffect(() => {
    if (!store.persist.hasHydrated()) void store.persist.rehydrate();
  }, [store]);

  return useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
    serverSnapshot,
  );
}
