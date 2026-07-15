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

/** Semantic direction of a change, used to pick up/down/flat coloring. */
export type Direction = "up" | "down" | "flat";

export function directionOf(value: number): Direction {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
