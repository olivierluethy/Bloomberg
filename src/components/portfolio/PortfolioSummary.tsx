"use client";

import { DataCell } from "@/components/primitives/DataCell";
import { Skeleton } from "@/components/primitives/Skeleton";
import { cn } from "@/lib/cn";
import { formatPercent, formatPrice, formatSigned } from "@/lib/format";
import type { PortfolioTotals } from "@/lib/portfolio";

/**
 * The headline row. A handful of scalars is a KPI row of stat tiles, not a
 * chart — market value leads as the hero figure and the rest read beside it.
 *
 * Up/down colour is reserved for P&L here (which is why the charts' palette
 * deliberately avoids green and red).
 */
export function PortfolioSummary({ totals, pending }: { totals: PortfolioTotals; pending: boolean }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-5">
      <Tile label="Market Value" hero pending={pending}>
        <DataCell
          value={totals.marketValue}
          display={formatPrice(totals.marketValue)}
          color="none"
          className="px-0 text-sm font-bold text-fg"
        />
      </Tile>

      <Tile label="Day P&L" pending={pending} sub={formatPercent(totals.dayPct)} subDir={dir(totals.dayPnL)}>
        <Money value={totals.dayPnL} />
      </Tile>

      <Tile label="Unrealized" pending={pending} sub={formatPercent(totals.unrealizedPct)} subDir={dir(totals.unrealizedPnL)}>
        <Money value={totals.unrealizedPnL} />
      </Tile>

      <Tile label="Realized" pending={pending}>
        <Money value={totals.realizedPnL} />
      </Tile>

      <Tile label="Total Return" pending={pending} sub={`on ${formatPrice(totals.costBasis)} basis`}>
        <div className="flex items-baseline gap-2">
          <Money value={totals.totalPnL} />
          <span className={cn("font-mono text-xs tabular-nums", toneOf(totals.totalPnL))}>
            {formatPercent(totals.totalReturnPct)}
          </span>
        </div>
      </Tile>
    </div>
  );
}

function Tile({
  label,
  children,
  sub,
  subDir,
  hero = false,
  pending,
}: {
  label: string;
  children: React.ReactNode;
  sub?: string;
  subDir?: "up" | "down";
  hero?: boolean;
  pending: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 border border-line bg-panel px-1.5 py-0.5", hero && "border-line-bright")}>
      <span className="eyebrow">{label}</span>
      {pending ? <Skeleton className="h-6 w-24" /> : children}
      {sub ? (
        <span className={cn("font-mono text-2xs tabular-nums", subDir ? toneOf(subDir === "up" ? 1 : -1) : "text-fg-faint")}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function Money({ value }: { value: number }) {
  return (
    <DataCell
      value={value}
      display={formatSigned(value)}
      color={dir(value)}
      className="px-0 text-base font-semibold"
    />
  );
}

function dir(value: number): "up" | "down" {
  return value >= 0 ? "up" : "down";
}

function toneOf(value: number): string {
  return value >= 0 ? "text-up" : "text-down";
}
