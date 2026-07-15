/**
 * Numeric formatters shared across the terminal. Kept dependency-free and
 * pure so the same output renders on server and client without drift.
 */

export function formatPrice(value: number, digits = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return sign + value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number, digits = 2): string {
  return `${formatSigned(value, digits)}%`;
}

/** Compact notation for volumes / market caps: 1.2M, 3.4B. */
export function formatCompact(value: number): string {
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  });
}

/** Compact relative age of a timestamp: "now", "4m", "3h", "2d". */
export function formatRelativeTime(epochMs: number, now: number = Date.now()): string {
  const diffMin = Math.floor((now - epochMs) / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

/** Semantic direction of a change, used to pick up/down/flat coloring. */
export type Direction = "up" | "down" | "flat";

export function directionOf(value: number): Direction {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
