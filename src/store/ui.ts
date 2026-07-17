"use client";

import { create } from "zustand";

/**
 * Ephemeral UI truth: what's open right now. Deliberately not persisted — a
 * reload should never restore a half-finished modal.
 */

/** Modals are addressed by name so any surface can open one without prop-drilling. */
export type ModalKind = "watchlists";

interface UIState {
  paletteOpen: boolean;
  /**
   * Bumped on every open. Overlay bodies are keyed by this so each open mounts
   * a fresh one: reopening during the close animation makes AnimatePresence
   * interrupt the exit and reuse the element, which would otherwise carry the
   * previous query/selection back into a "new" overlay.
   */
  paletteSeq: number;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;

  /** A stack, so a modal opened from the palette returns to it on close. */
  modals: ModalKind[];
  modalSeq: number;
  openModal: (kind: ModalKind) => void;
  closeModal: () => void;
  closeAllModals: () => void;

  /** Symbol shown in the asset-detail workspace, or null when it's closed. */
  workspaceSymbol: string | null;
  workspaceSeq: number;
  openWorkspace: (symbol: string) => void;
  closeWorkspace: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  paletteOpen: false,
  paletteSeq: 0,
  openPalette: () => set((s) => ({ paletteOpen: true, paletteSeq: s.paletteSeq + 1 })),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () =>
    set((s) =>
      s.paletteOpen ? { paletteOpen: false } : { paletteOpen: true, paletteSeq: s.paletteSeq + 1 },
    ),

  modals: [],
  modalSeq: 0,
  openModal: (kind) =>
    set((s) =>
      s.modals.includes(kind) ? s : { modals: [...s.modals, kind], modalSeq: s.modalSeq + 1 },
    ),
  closeModal: () => set((s) => ({ modals: s.modals.slice(0, -1) })),
  closeAllModals: () => set({ modals: [] }),

  workspaceSymbol: null,
  workspaceSeq: 0,
  // Opening the workspace dismisses the palette: it's a jump, not a stack.
  openWorkspace: (symbol) =>
    set((s) => ({ workspaceSymbol: symbol, workspaceSeq: s.workspaceSeq + 1, paletteOpen: false })),
  closeWorkspace: () => set({ workspaceSymbol: null }),
}));

/** True when `kind` is the modal currently on top of the stack. */
export function useIsModalOpen(kind: ModalKind): boolean {
  return useUIStore((s) => s.modals[s.modals.length - 1] === kind);
}
