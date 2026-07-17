"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { SourceTag } from "@/components/primitives/SourceTag";
import { AXIS_INK, GRID_INK, SERIES_INK } from "@/config/viz";
import { YIELD_CURVE } from "@/config/econ";
import { useEconomicSeriesBatch } from "@/data/hooks";
import { cn } from "@/lib/cn";

/**
 * The treasury curve: yield against maturity, short end → long end.
 *
 * The x-axis is maturity by category rather than by years — the real spacing
 * (1 month to 30 years) would crush the whole front end, which is where the
 * information is, into the first few pixels.
 *
 * The 2s10s spread is called out because an inverted curve is the single thing
 * anyone reads this chart for, and "10Y below 2Y" is not obvious from a line.
 */
export function YieldCurve() {
  const ids = YIELD_CURVE.map((c) => c.id);
  const results = useEconomicSeriesBatch(ids);
  const isPending = results.some((r) => r.isPending);
  const source = results.find((r) => r.data)?.data;

  if (isPending) return <SkeletonRows rows={4} />;

  const data = YIELD_CURVE.map((c, i) => ({
    label: c.label,
    yield: results[i]?.data?.data.at(-1)?.value ?? 0,
  })).filter((d) => d.yield > 0);

  if (data.length === 0) return <p className="p-1 text-sm text-fg-faint">No curve data.</p>;

  const two = data.find((d) => d.label === "2Y")?.yield;
  const ten = data.find((d) => d.label === "10Y")?.yield;
  const spread = two !== undefined && ten !== undefined ? ten - two : undefined;

  const yields = data.map((d) => d.yield);
  const pad = (Math.max(...yields) - Math.min(...yields)) * 0.25 || 0.2;

  return (
    <div className="flex h-full flex-col p-1">
      <div className="mb-2 flex items-center justify-between gap-2">
        {spread !== undefined ? (
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">2s10s</span>
            <span className={cn("font-mono text-sm tabular-nums", spread < 0 ? "text-down" : "text-up")}>
              {spread >= 0 ? "+" : ""}
              {(spread * 100).toFixed(0)} bp
            </span>
            <span className="text-2xs text-fg-faint">{spread < 0 ? "inverted" : "normal"}</span>
          </div>
        ) : (
          <span />
        )}
        <SourceTag source={source?.source} provider={source?.provider} />
      </div>

      <div className="min-h-0 flex-1" style={{ minHeight: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID_INK} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: AXIS_INK, fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: GRID_INK }}
            />
            <YAxis
              domain={[Math.min(...yields) - pad, Math.max(...yields) + pad]}
              tick={{ fill: AXIS_INK, fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={34}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-line-bright)" }}
              content={({ payload, label }) => {
                const p = payload?.[0];
                if (!p) return null;
                return (
                  <div className="border border-line bg-void px-1.5 py-0.5">
                    <p className="font-mono text-2xs text-fg-dim">{String(label)} treasury</p>
                    <p className="font-mono text-xs tabular-nums text-fg">{Number(p.value).toFixed(2)}%</p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="yield"
              stroke={SERIES_INK}
              strokeWidth={2}
              isAnimationActive={false}
              dot={{ r: 2.5, fill: SERIES_INK, stroke: "none" }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
