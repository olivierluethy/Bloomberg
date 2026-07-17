"use client";

import { useEffect, useState } from "react";
import { TickerTape } from "@/components/shell/TickerTape";

/**
 * The top strip: brand, scrolling ticker tape, clock — one 24px line.
 *
 * The ⌘K affordance used to live here as a search input. It now sits at the
 * bottom of the shell as a real command line (see shell/CommandLine), which is
 * where the terminal grammar puts it and what frees this row for the tape.
 */
export function CommandBar() {
  return (
    <header className="flex h-6 shrink-0 items-center gap-1.5 border-b border-line bg-void px-1.5">
      <span className="shrink-0 text-xs font-bold tracking-widest text-amber2">TERM</span>
      <TickerTape />
      <Clock />
    </header>
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
    <div className="hidden shrink-0 items-baseline gap-1 text-xs md:flex">
      <span className="tabular-nums text-fg">{now ?? "--:--:--"}</span>
      <span className="text-2xs text-fg-dim">UTC</span>
    </div>
  );
}
