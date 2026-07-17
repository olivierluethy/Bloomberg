"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/store/ui";

/**
 * The command bar is the spine of the terminal: the prompt opens the ⌘K
 * palette, which is the primary way you drive the app.
 */
export function CommandBar() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-elevated px-3">
      <Brand />
      <CommandTrigger />
      <Clock />
    </header>
  );
}

function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-amber" aria-hidden>◆</span>
      <span className="font-mono text-sm font-bold tracking-widest text-fg">TERM</span>
    </div>
  );
}

function CommandTrigger() {
  const openPalette = useUIStore((s) => s.openPalette);
  return (
    <button
      type="button"
      onClick={openPalette}
      className="group flex h-7 flex-1 items-center gap-2 border border-line bg-void px-2 text-left transition-colors hover:border-line-bright"
      aria-label="Open command palette"
      aria-keyshortcuts="Meta+K Control+K"
    >
      <span className="font-mono text-sm text-amber" aria-hidden>{">"}</span>
      <span className="font-mono text-sm text-fg-faint">Search markets, run a command…</span>
      <span className="caret-blink font-mono text-sm text-amber" aria-hidden>▌</span>
      <kbd className="ml-auto hidden rounded-none border border-line px-1.5 py-0.5 font-mono text-2xs text-fg-dim sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

function Clock() {
  // Rendered only after mount to avoid a server/client time mismatch.
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          timeZone: "UTC",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden shrink-0 items-baseline gap-1.5 font-mono md:flex">
      <span className="text-sm tabular-nums text-fg">{now ?? "--:--:--"}</span>
      <span className="text-2xs text-fg-faint">UTC</span>
    </div>
  );
}
