"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { SourceTag } from "@/components/primitives/SourceTag";
import { SkeletonRows, SkeletonText } from "@/components/primitives/Skeleton";
import { symbolName } from "@/config/symbols";
import { useAnalystEstimates, useFundamentals, useOwnership } from "@/data/hooks";
import { formatCompact, formatPrice } from "@/lib/format";
import type { AnalystRating } from "@/data/types";

/**
 * The deep-detail drawer under the chart: company profile, analyst estimates,
 * and ownership.
 *
 * Estimates and ownership have no viable free source, so they are always
 * Faker-generated — the SourceTag on each tab says so rather than letting a
 * plausible-looking number pass for real.
 */

const TABS = ["Profile", "Estimates", "Ownership"] as const;
type Tab = (typeof TABS)[number];

export function DetailTabs({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<Tab>("Profile");

  return (
    <div className="flex min-h-0 flex-col">
      <div role="tablist" aria-label="Asset details" className="flex shrink-0 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-3 py-1.5 text-sm transition-colors",
              t === tab
                ? "border-amber text-fg"
                : "border-transparent text-fg-dim hover:bg-elevated hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "Profile" && <ProfileTab symbol={symbol} />}
        {tab === "Estimates" && <EstimatesTab symbol={symbol} />}
        {tab === "Ownership" && <OwnershipTab symbol={symbol} />}
      </div>
    </div>
  );
}

function ProfileTab({ symbol }: { symbol: string }) {
  const { data, isPending } = useFundamentals(symbol);
  const f = data?.data;

  if (isPending) return <SkeletonText lines={4} className="p-3" />;
  if (!f) return <Empty>No profile available for {symbol}.</Empty>;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The catalog knows the real name; the mock adapter can only invent
              one. Prefer the truth so this never contradicts the header. */}
          <p className="text-sm font-semibold text-fg">{symbolName(symbol) || f.name || symbol}</p>
          <p className="text-xs text-fg-dim">
            {[f.sector, f.industry].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <SourceTag source={data?.source} provider={data?.provider} />
      </div>
      {f.description ? <p className="text-sm leading-relaxed text-fg-dim">{f.description}</p> : null}
    </div>
  );
}

function EstimatesTab({ symbol }: { symbol: string }) {
  const { data, isPending } = useAnalystEstimates(symbol);
  const est = data?.data;

  if (isPending) return <SkeletonRows rows={4} />;
  if (!est) return <Empty>No estimates available for {symbol}.</Empty>;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <RatingBadge rating={est.rating} />
        <div className="flex items-baseline gap-2 font-mono text-xs tabular-nums">
          <span className="text-fg-faint">Target</span>
          <span className="text-fg-dim">{formatPrice(est.targetLow)}</span>
          <span className="text-amber">{formatPrice(est.targetMean)}</span>
          <span className="text-fg-dim">{formatPrice(est.targetHigh)}</span>
        </div>
        <SourceTag source={data?.source} provider={data?.provider} className="ml-auto" />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <Th>Period</Th>
            <Th align="right">Revenue</Th>
            <Th align="right">EPS</Th>
            <Th align="right">Analysts</Th>
          </tr>
        </thead>
        <tbody>
          {est.estimates.map((e) => (
            <tr key={e.period} className="border-b border-line last:border-0">
              <td className="py-1.5 font-mono text-xs text-fg">{e.period}</td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums text-fg-dim">
                {formatCompact(e.revenueAvg)}
              </td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums text-fg-dim">
                {e.epsAvg.toFixed(2)}
              </td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums text-fg-faint">
                {e.numAnalysts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OwnershipTab({ symbol }: { symbol: string }) {
  const { data, isPending } = useOwnership(symbol);
  const own = data?.data;

  if (isPending) return <SkeletonRows rows={4} />;
  if (!own) return <Empty>No ownership data for {symbol}.</Empty>;

  const segments = [
    { label: "Institutional", pct: own.institutionalPct, cls: "bg-cyan" },
    { label: "Insider", pct: own.insiderPct, cls: "bg-amber" },
    { label: "Retail", pct: own.retailPct, cls: "bg-line-bright" },
  ];

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Holder Breakdown</span>
        <SourceTag source={data?.source} provider={data?.provider} />
      </div>

      {/* The mock guarantees these sum to 100, so the bar always fills. */}
      <div className="flex h-2 w-full overflow-hidden bg-elevated">
        {segments.map((s) => (
          <div key={s.label} className={s.cls} style={{ width: `${s.pct}%` }} title={`${s.label} ${s.pct}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className={cn("h-2 w-2", s.cls)} aria-hidden />
            <span className="text-fg-dim">{s.label}</span>
            <span className="font-mono tabular-nums text-fg">{s.pct.toFixed(1)}%</span>
          </span>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <Th>Top Holder</Th>
            <Th align="right">Shares</Th>
            <Th align="right">% Out</Th>
          </tr>
        </thead>
        <tbody>
          {own.topHolders.map((h) => (
            <tr key={h.name} className="border-b border-line last:border-0">
              <td className="truncate py-1.5 text-xs text-fg">{h.name}</td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums text-fg-dim">
                {formatCompact(h.shares)}
              </td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums text-fg-dim">
                {h.pctOfShares.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RATING_STYLES: Record<AnalystRating, string> = {
  "Strong Buy": "border-up/50 text-up",
  Buy: "border-up/40 text-up/80",
  Hold: "border-line-bright text-fg-dim",
  Sell: "border-down/40 text-down/80",
  "Strong Sell": "border-down/50 text-down",
};

function RatingBadge({ rating }: { rating: AnalystRating }) {
  return (
    <span
      className={cn(
        "border px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wide",
        RATING_STYLES[rating],
      )}
    >
      {rating}
    </span>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn("pb-1 font-normal", align === "right" && "text-right")}>
      <span className="eyebrow">{children}</span>
    </th>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-3 text-sm text-fg-faint">{children}</p>;
}
