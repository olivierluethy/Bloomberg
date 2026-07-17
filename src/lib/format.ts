/**
 * Numeric formatters shared across the terminal. Pure, so the same output
 * renders on server and client without drift.
 */

import { classifySymbol } from "@/data/provider";

/**
 * How many decimals a price is quoted to, by asset class.
 *
 * This lived in six components that quietly disagreed: a bond yield showed
 * three decimals in the workspace and two on the markets summary chip, and
 * sub-$1 crypto was rounded to cents in half the app. Same number, different
 * answer depending on which panel you read it in. One rule, one place.
 */
export function priceDigits(symbol: string, price?: number): number {
  const cls = classifySymbol(symbol);
  if (cls === "forex") return 4; // pips
  if (cls === "bond") return 3; // yields move in basis points
  // Sub-$1 instruments (DOGE, some FX crosses) need the extra places to move.
  return price !== undefined && price < 10 ? 4 : 2;
}

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
