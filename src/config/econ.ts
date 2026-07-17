/**
 * The macro series the economy module tracks, keyed by FRED series id.
 *
 * One catalog, two consumers: the UI reads labels/units/formatting, and the mock
 * adapter reads `mock` to generate a plausible fallback. Keeping them in one
 * file means a series can't exist for the chart but not the generator.
 *
 * `mock` is what this indicator actually looks like — a level and a per-period
 * step. Without it every series is the same anonymous random walk, and a CPI
 * index of 4.2 next to an unemployment rate of 4.2 is worse than no data: it's
 * data that looks real and isn't.
 */

export type EconUnit = "percent" | "index" | "usd_billions" | "thousands";
export type EconFrequency = "monthly" | "quarterly" | "daily";
export type EconGroup = "Growth" | "Inflation" | "Labor" | "Rates";

export interface EconSeries {
  /** FRED series id, e.g. "CPIAUCSL". */
  id: string;
  label: string;
  /** Compact name for tiles and axes. */
  short: string;
  group: EconGroup;
  units: EconUnit;
  frequency: EconFrequency;
  /** True when a rise is bad news (unemployment, inflation). Drives tile tone. */
  inverse?: boolean;
  /** Plausibility profile for the mock fallback. */
  mock: { level: number; step: number; min?: number; max?: number };
}

export const ECON_SERIES: EconSeries[] = [
  {
    id: "GDPC1",
    label: "Real Gross Domestic Product",
    short: "Real GDP",
    group: "Growth",
    units: "usd_billions",
    frequency: "quarterly",
    mock: { level: 22_900, step: 70, min: 18_000 },
  },
  {
    id: "CPIAUCSL",
    label: "Consumer Price Index (All Urban)",
    short: "CPI",
    group: "Inflation",
    units: "index",
    frequency: "monthly",
    inverse: true,
    mock: { level: 308, step: 0.7, min: 250 },
  },
  {
    id: "UNRATE",
    label: "Unemployment Rate",
    short: "Unemployment",
    group: "Labor",
    units: "percent",
    frequency: "monthly",
    inverse: true,
    mock: { level: 4.1, step: 0.1, min: 3, max: 11 },
  },
  {
    id: "PAYEMS",
    label: "Total Nonfarm Payrolls",
    short: "Payrolls",
    group: "Labor",
    units: "thousands",
    frequency: "monthly",
    mock: { level: 158_500, step: 180, min: 130_000 },
  },
  {
    id: "FEDFUNDS",
    label: "Federal Funds Effective Rate",
    short: "Fed Funds",
    group: "Rates",
    units: "percent",
    frequency: "monthly",
    mock: { level: 4.6, step: 0.12, min: 0, max: 9 },
  },
  {
    id: "UMCSENT",
    label: "Consumer Sentiment (U. Michigan)",
    short: "Sentiment",
    group: "Growth",
    units: "index",
    frequency: "monthly",
    mock: { level: 71, step: 2.2, min: 45, max: 105 },
  },
];

/**
 * The treasury curve, short end → long end. Order is the x-axis, so it's fixed
 * by maturity rather than by series id.
 */
export interface CurvePoint {
  id: string;
  label: string;
  /** Years to maturity — used for spacing and ordering. */
  years: number;
  mock: { level: number };
}

export const YIELD_CURVE: CurvePoint[] = [
  { id: "DGS1MO", label: "1M", years: 1 / 12, mock: { level: 4.85 } },
  { id: "DGS3MO", label: "3M", years: 0.25, mock: { level: 4.78 } },
  { id: "DGS6MO", label: "6M", years: 0.5, mock: { level: 4.62 } },
  { id: "DGS1", label: "1Y", years: 1, mock: { level: 4.41 } },
  { id: "DGS2", label: "2Y", years: 2, mock: { level: 4.18 } },
  { id: "DGS5", label: "5Y", years: 5, mock: { level: 4.05 } },
  { id: "DGS7", label: "7Y", years: 7, mock: { level: 4.14 } },
  { id: "DGS10", label: "10Y", years: 10, mock: { level: 4.26 } },
  { id: "DGS20", label: "20Y", years: 20, mock: { level: 4.55 } },
  { id: "DGS30", label: "30Y", years: 30, mock: { level: 4.48 } },
];

const BY_ID = new Map<string, EconSeries>(ECON_SERIES.map((s) => [s.id, s]));

export function findSeries(id: string): EconSeries | undefined {
  return BY_ID.get(id);
}

/** Mock profile for any id in the catalog or the curve. */
export function mockProfile(id: string): { level: number; step: number; min?: number; max?: number } | undefined {
  const series = BY_ID.get(id);
  if (series) return series.mock;
  const curve = YIELD_CURVE.find((c) => c.id === id);
  // Curve points are daily yields: same shape, gentle step.
  return curve ? { level: curve.mock.level, step: 0.06, min: 0, max: 9 } : undefined;
}

/** Formats a value for its unit. Kept here so tiles, axes and tooltips agree. */
export function formatEcon(value: number, units: EconUnit): string {
  switch (units) {
    case "percent":
      return `${value.toFixed(2)}%`;
    case "usd_billions":
      return `$${(value / 1000).toFixed(2)}T`;
    case "thousands":
      return `${(value / 1000).toFixed(1)}M`;
    default:
      return value.toFixed(1);
  }
}

/**
 * Formats a change, which is not the same as formatting a level. A bare
 * "-4.20 vs prior" under a payrolls figure reading 158.5M is unreadable: the
 * number is in thousands, so it means 4,200 jobs. And a move in a rate is
 * percentage points, not percent — a 0.03 change in a 4.6% rate is +0.03pp,
 * whereas "+0.03%" would say something different and false.
 */
export function formatEconDelta(value: number, units: EconUnit): string {
  const sign = value >= 0 ? "+" : "−";
  const v = Math.abs(value);
  switch (units) {
    case "percent":
      return `${sign}${v.toFixed(2)}pp`;
    case "usd_billions":
      return `${sign}$${v.toFixed(1)}B`;
    case "thousands":
      return `${sign}${v.toFixed(0)}K`;
    default:
      return `${sign}${v.toFixed(2)}`;
  }
}

/**
 * Decimals an axis needs so its ticks stay distinct. A series that only moves
 * between 308.0 and 310.9 rendered "311, 310, 309, 308, 308" at zero decimals —
 * two ticks with the same label at different heights.
 */
export function tickDigits(min: number, max: number): number {
  const span = Math.abs(max - min);
  if (span >= 20) return 0;
  if (span >= 2) return 1;
  return 2;
}
