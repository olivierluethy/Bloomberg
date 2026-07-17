/**
 * Categorical palette for the analytical charts.
 *
 * These are NOT free choices — the values come from a documented categorical
 * palette and the order is the colorblind-safety mechanism, so both were
 * validated rather than eyeballed (OKLab ΔE under simulated protanopia and
 * deuteranopia, against this app's panel surface #111214):
 *
 *   lightness band  PASS   all 6 within the dark band (L 0.48–0.67)
 *   chroma floor    PASS   all 6 >= 0.10
 *   CVD separation  PASS   worst adjacent pair ΔE 8.4 (protan)
 *   normal vision   PASS   worst adjacent pair ΔE 19.3
 *   contrast        PASS   all 6 >= 3:1 on the panel surface
 *
 * Two constraints shaped this:
 *
 *  1. Green and red are RESERVED. In a P&L context they mean gain and loss, so
 *     using them for asset-class identity would make a color mean two things in
 *     one screen. This is the documented palette's canonical hue order with
 *     those two families omitted — the relative order is preserved, which is
 *     what keeps the adjacent pairs safe.
 *  2. Order is adjacency. Only neighbouring segments of a stacked bar touch, so
 *     the sequence below IS the tested pairlist. Reordering it re-opens the
 *     check — an earlier attempt put orange next to yellow (ΔE 4.8, a fail).
 *
 * The terminal's own cyan token was the obvious first choice and was rejected
 * by the same check: at L 0.754 it's outside the dark-mode band.
 */

import type { AssetClass } from "@/data/types";

/** Fixed hue per asset class. Color follows the entity, never its rank. */
export const ASSET_CLASS_COLORS: Record<Exclude<AssetClass, "unknown">, string> = {
  stock: "#3987e5", // blue
  etf: "#d55181", // magenta
  crypto: "#c98500", // yellow
  commodity: "#199e70", // aqua
  forex: "#d95926", // orange
  bond: "#9085e9", // violet
  index: "#8a8d93", // flat grey — an index isn't directly investable; here as a tail
};

/**
 * The order segments are drawn in, which fixes which pairs end up adjacent.
 * Do not reorder without re-running the palette validator.
 */
export const ASSET_CLASS_ORDER: AssetClass[] = [
  "stock",
  "etf",
  "crypto",
  "commodity",
  "forex",
  "bond",
  "index",
  "unknown",
];

export function assetClassColor(cls: AssetClass): string {
  return cls === "unknown" ? "#55585f" : ASSET_CLASS_COLORS[cls];
}

/**
 * Single hue for magnitude bars (sector exposure). Nominal categories whose
 * length already encodes the value take one hue — colouring them by value would
 * spend the identity channel re-encoding what the bar already shows.
 */
export const MAGNITUDE_HUE = "#3987e5";

/** Recessive grid/axis ink, matching the app's line tokens. */
export const AXIS_INK = "#55585f";
export const GRID_INK = "#24262b";
