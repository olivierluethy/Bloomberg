"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { type Direction } from "@/lib/format";

/**
 * Signature element. A numeric cell that briefly flashes green/red when its
 * value ticks up/down — the live-tape feel of a trading terminal.
 *
 * Rendering is deterministic (the passed `display` string), so it is safe on
 * the server; the flash only ever fires on a client-side value change.
 */
export function DataCell({
  value,
  display,
  color = "auto",
  className,
}: {
  /** Numeric value used to detect tick direction. */
  value: number;
  /** Pre-formatted string to show (keeps formatting decisions at the call site). */
  display: string;
  /** Fixed semantic color, or "auto" to color by tick direction, or "none". */
  color?: Direction | "auto" | "none";
  className?: string;
}) {
  const [flash, setFlash] = useState<Direction | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (value > prev.current) setFlash("up");
    else if (value < prev.current) setFlash("down");
    prev.current = value;

    if (value === prev.current && flash === null) return;
    const timer = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(timer);
    // Intentionally keyed only on `value`: we react to ticks, not re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const colorClass =
    color === "none"
      ? undefined
      : color === "auto"
        ? flash === "up"
          ? "text-up"
          : flash === "down"
            ? "text-down"
            : "text-fg"
        : color === "up"
          ? "text-up"
          : color === "down"
            ? "text-down"
            : "text-flat";

  return (
    <span
      className={cn(
        "inline-block px-1 font-mono tabular-nums",
        flash === "up" && "flash-up",
        flash === "down" && "flash-down",
        colorClass,
        className,
      )}
    >
      {display}
    </span>
  );
}
