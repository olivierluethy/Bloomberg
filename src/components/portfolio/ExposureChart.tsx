"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { SourceTag } from "@/components/primitives/SourceTag";
import { GRID_INK, LABEL_INK, MAGNITUDE_HUE, assetClassLabel } from "@/config/viz";
import { classifySymbol } from "@/data/provider";
import { useFundamentalsBatch } from "@/data/hooks";
import { formatPrice } from "@/lib/format";
import type { ValuedPosition } from "@/lib/portfolio";

/**
 * Sector exposure — how much money sits behind each sector.
 *
 * Comparing magnitude across nominal categories, so: horizontal bars (the
 * sector names are long and read straight), sorted high→low, and ONE hue.
 * Colouring each bar differently would spend the identity channel re-encoding
 * what bar length already shows.
 *
 * Sectors come from fundamentals, which are simulated — the SourceTag says so.
 * Sectors are an equity concept, so only stocks and ETFs get one; crypto, FX and
 * futures are bucketed by asset class instead. The adapter would happily return
 * a sector for Bitcoin, and taking it would put half the portfolio under
 * "Technology" — a number that looks authoritative and means nothing.
 */
export function ExposureChart({ valued }: { valued: ValuedPosition[] }) {
  const symbols = useMemo(() => valued.filter((p) => !p.pending).map((p) => p.symbol), [valued]);
  const results = useFundamentalsBatch(symbols);
  const isPending = results.some((r) => r.isPending);
  const source = results.find((r) => r.data)?.data;

  // Derived per render: useQueries returns a new array each time, so a dep list
  // keyed on it would never hit. Summing a handful of positions is nothing.
  const totals = new Map<string, number>();
  symbols.forEach((symbol, i) => {
    const position = valued.find((p) => p.symbol === symbol);
    if (!position) return;
    // Sectors are an equity idea. Bitcoin has no sector, and the fundamentals
    // adapter will happily hand one over anyway — taking it would file half the
    // portfolio under "Technology". Non-equities are bucketed by what they are.
    const cls = classifySymbol(symbol);
    const isEquity = cls === "stock" || cls === "etf";
    const key = isEquity ? (results[i]?.data?.data.sector ?? "Unclassified") : assetClassLabel(cls);
    totals.set(key, (totals.get(key) ?? 0) + position.marketValue);
  });
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  const data = [...totals.entries()]
    .map(([sector, value]) => {
      const weight = grand > 0 ? (value / grand) * 100 : 0;
      // Precomputed so the direct label is plain data, not a render-time format.
      return { sector, value, weight, pctLabel: `${weight.toFixed(0)}%` };
    })
    .sort((a, b) => b.value - a.value);

  if (isPending) return <SkeletonRows rows={4} />;
  if (data.length === 0) return <p className="p-3 text-sm text-fg-faint">No exposure to show.</p>;

  return (
    <div className="flex flex-col p-3">
      <div className="mb-1 flex justify-end">
        <SourceTag source={source?.source} provider={source?.provider} />
      </div>
      {/* An explicit height, not flex-1: ResponsiveContainer measures its parent,
          and inside a min-h-0 flex column that measurement collapses to zero. */}
      <div style={{ height: data.length * 30 + 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID_INK} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="sector"
              width={116}
              tickLine={false}
              axisLine={false}
              tick={{ fill: LABEL_INK, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-elevated)" }}
              content={({ payload }) => {
                const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!d) return null;
                return (
                  <div className="border border-line-bright bg-elevated px-2 py-1 shadow-lg">
                    <p className="font-mono text-2xs text-fg-dim">{d.sector}</p>
                    <p className="font-mono text-xs tabular-nums text-fg">
                      {d.weight.toFixed(1)}% · {formatPrice(d.value, 0)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              fill={MAGNITUDE_HUE}
              isAnimationActive={false}
              barSize={14}
              // Rounded data-end, anchored square to the baseline.
              radius={[0, 4, 4, 0]}
            >
              {/* Direct labels: the value is readable without hovering. */}
              <LabelList
                dataKey="pctLabel"
                position="right"
                fill={LABEL_INK}
                fontSize={10}
                fontFamily="var(--font-jetbrains)"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
