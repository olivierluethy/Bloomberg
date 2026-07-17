"use client";

import { useUIStore } from "@/store/ui";

/**
 * The command line — an amber `>` prompt, a blinking solid block cursor, and a
 * green <GO>.
 *
 * This is the same ⌘K affordance that used to render as a bordered search input
 * in the top bar: still one button, still `openPalette`, still announced as
 * "Open command palette". Only the chrome changed.
 *
 * Deliberately NOT a real <input>. Typing happens in the palette overlay, and a
 * focusable field here would take the caret and swallow the first keystroke
 * before the palette mounts. The hint is the reference's grey placeholder tone
 * rather than amber, because amber here reads as text you already typed.
 */
export function CommandLine() {
  const openPalette = useUIStore((s) => s.openPalette);

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Open command palette"
      aria-keyshortcuts="Meta+K Control+K"
      className="group flex h-6 w-full shrink-0 items-center gap-2 border-t border-line bg-void px-1.5 text-left text-xs"
    >
      <span className="text-amber" aria-hidden>
        {">"}
      </span>
      <span className="text-fg-dim uppercase group-hover:text-amber">
        Search markets, run a command
      </span>
      <span className="block-cursor shrink-0" aria-hidden />
      <span className="ml-auto shrink-0 text-up" aria-hidden>
        {"<GO>"}
      </span>
    </button>
  );
}
