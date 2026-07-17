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

/** Display names — `capitalize` turns "etf" into "Etf", which reads as a typo. */
const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  commodity: "Commodities",
  forex: "FX",
  bond: "Bonds",
  index: "Indices",
  unknown: "Other",
};

export function assetClassLabel(cls: AssetClass): string {
  return ASSET_CLASS_LABELS[cls];
}

/**
 * Single hue for magnitude bars (sector exposure). Nominal categories whose
 * length already encodes the value take one hue — colouring them by value would
 * spend the identity channel re-encoding what the bar already shows.
 */
export const MAGNITUDE_HUE = "#3987e5";

/**
 * Chart ink, taken from the design tokens rather than copied as hexes — SVG
 * resolves `var()` fine, and the copies had already drifted: chart ticks kept
 * the old #55585f after the text ramp was raised for contrast, so the labels
 * stayed at 2.5:1 while the rest of the app was fixed.
 *
 * Both AXIS_INK and LABEL_INK are TEXT inks and are both amber — the terminal's
 * default. Despite the name, AXIS_INK has never coloured an axis *line*: every
 * call site uses it as a tick label `fill` and reaches for GRID_INK for the rule
 * itself. Pointing it at the divider grey on the theory that "axis" meant the
 * line made every Recharts tick label the same colour as the hairline — the
 * exact drift this comment block exists to warn about, one rename later.
 */
export const AXIS_INK = "var(--color-amber)";
export const LABEL_INK = "var(--color-amber)";
export const GRID_INK = "var(--color-line)";

/**
 * Ink for a single-series line/area chart (the macro series, the yield curve).
 *
 * Amber, because a chart line carrying one series has no identity to encode —
 * it's the terminal's default ink doing its default job, and the reference draws
 * exactly this. Distinct from MAGNITUDE_HUE below, which fills *bars* whose
 * length already carries the value; keeping them separate means retinting the
 * lines can't silently retint the bars.
 */
export const SERIES_INK = "var(--color-amber)";
