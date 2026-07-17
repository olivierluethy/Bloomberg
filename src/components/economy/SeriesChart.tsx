"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_INK, GRID_INK, SERIES_INK } from "@/config/viz";
import { formatEcon, tickDigits, type EconSeries } from "@/config/econ";
import type { EconPoint } from "@/data/types";

/**
 * One macro series over time.
 *
 * Trend over time is a line, and a single series takes one hue with no legend —
 * the panel title names it. Area fill (not a second colour) carries the eye
 * along the series without adding an encoding that means nothing.
 *
 * The y-axis is deliberately NOT zero-based: CPI moving 305→308 is the story,
 * and a zero baseline would flatten it into a straight line. Bars would have to
 * start at zero; a line measuring change does not.
 */
export function SeriesChart({ series, points }: { series: EconSeries; points: EconPoint[] }) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || Math.abs(max * 0.02) || 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`fill-${series.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_INK} stopOpacity={0.28} />
            <stop offset="100%" stopColor={SERIES_INK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_INK} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: AXIS_INK, fontSize: 9 }}
          tickLine={false}
          axisLine={{ stroke: GRID_INK }}
          minTickGap={28}
          tickFormatter={(d: string) => d.slice(2, 7)}
        />
        <YAxis
          domain={[min - pad, max + pad]}
          tick={{ fill: AXIS_INK, fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(v: number) => compactTick(v, series, min, max)}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-line-bright)" }}
          content={({ payload, label }) => {
            const p = payload?.[0];
            if (!p) return null;
            return (
              <div className="border border-line bg-void px-1.5 py-0.5">
                <p className="font-mono text-2xs text-fg-dim">{String(label)}</p>
                <p className="font-mono text-xs tabular-nums text-fg">
                  {formatEcon(Number(p.value), series.units)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={SERIES_INK}
          strokeWidth={2}
          fill={`url(#fill-${series.id})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3, fill: SERIES_INK, stroke: "none" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Axis ticks are short — the full unit formatting lives in the tooltip. Decimals
 * are chosen from the series' own range so two ticks at different heights can't
 * end up with the same label.
 */
function compactTick(value: number, series: EconSeries, min: number, max: number): string {
  switch (series.units) {
    case "usd_billions":
      return `${(value / 1000).toFixed(tickDigits(min / 1000, max / 1000))}T`;
    case "thousands":
      return `${(value / 1000).toFixed(tickDigits(min / 1000, max / 1000))}M`;
    default:
      return value.toFixed(tickDigits(min, max));
  }
}
