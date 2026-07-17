"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import { Skeleton } from "@/components/primitives/Skeleton";
import { ASSET_CLASS_ORDER, assetClassColor, assetClassLabel } from "@/config/viz";
import { classifySymbol } from "@/data/provider";
import { groupByValue, type ValuedPosition } from "@/lib/portfolio";
import { formatPrice } from "@/lib/format";
import type { AssetClass } from "@/data/types";

/**
 * Allocation by asset class.
 *
 * Part-to-whole is a stacked bar, not a donut: angles are hard to compare and a
 * ring of thin slices is unreadable at terminal density. One horizontal bar
 * reads as "the portfolio", and each segment's width is directly comparable.
 *
 * Segments are drawn in a fixed class order because only neighbours touch —
 * that order is the pairlist the palette was validated against (see config/viz).
 * Identity never rests on colour alone: every segment is legended, and anything
 * wide enough is labelled in place.
 */
export function AllocationChart({ valued, pending }: { valued: ValuedPosition[]; pending: boolean }) {
  const groups = useMemo(() => {
    const byClass = groupByValue(valued, (p) => classifySymbol(p.symbol) as AssetClass);
    // Fixed order, not descending weight: colour follows the entity, and a
    // rebalance must not repaint the chart.
    return byClass.sort((a, b) => ASSET_CLASS_ORDER.indexOf(a.key) - ASSET_CLASS_ORDER.indexOf(b.key));
  }, [valued]);

  if (pending) return <Skeleton className="mx-3 my-4 h-8" />;
  if (groups.length === 0) {
    return <p className="p-1 text-sm text-fg-faint">Nothing allocated yet.</p>;
  }

  // Recharts stacks one row: a single datum with a key per class. The row needs a
  // category of its own — without a category axis the bars have no band to sit
  // in and render at zero height.
  const row = { name: "portfolio", ...Object.fromEntries(groups.map((g) => [g.key, g.weight])) };

  return (
    <div className="flex flex-col gap-1.5 p-1">
      <div className="h-9 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[row]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              cursor={false}
              content={({ payload }) => {
                const p = payload?.[0];
                if (!p) return null;
                const g = groups.find((x) => x.key === p.dataKey);
                if (!g) return null;
                return <ChartTooltip label={assetClassLabel(g.key)} weight={g.weight} value={g.value} />;
              }}
            />
            {groups.map((g) => (
              <Bar key={g.key} dataKey={g.key} stackId="alloc" isAnimationActive={false}>
                {/* A 2px surface gap keeps adjacent fills from bleeding together. */}
                <Cell fill={assetClassColor(g.key)} stroke="var(--color-panel)" strokeWidth={2} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 shrink-0" style={{ background: assetClassColor(g.key) }} aria-hidden />
            <span className="text-fg-dim">{assetClassLabel(g.key)}</span>
            <span className="font-mono tabular-nums text-fg">{g.weight.toFixed(1)}%</span>
            <span className="font-mono tabular-nums text-fg-faint">{formatPrice(g.value, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltip({ label, weight, value }: { label: string; weight: number; value: number }) {
  return (
    <div className="border border-line bg-void px-1.5 py-0.5">
      <p className="font-mono text-2xs text-fg-dim">{label}</p>
      <p className="font-mono text-xs tabular-nums text-fg">
        {weight.toFixed(1)}% · {formatPrice(value, 0)}
      </p>
    </div>
  );
}
