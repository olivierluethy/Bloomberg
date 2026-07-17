"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/primitives/Panel";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { SourceTag } from "@/components/primitives/SourceTag";
import { cn } from "@/lib/cn";
import { MODULES } from "@/config/modules";
import { symbolName } from "@/config/symbols";
import { useEarningsCalendar, useEconomicCalendar, useIpoCalendar } from "@/data/hooks";
import { formatCompact, formatPrice } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import type { DateRange, EarningsEvent, EconomicEvent, EventImpact, IpoEvent } from "@/data/types";

/**
 * Earnings, economic releases, and IPOs.
 *
 * All three are date-ordered lists, so they're tables — a calendar grid would
 * spend a screen to say less. Rows group under a date heading, and today is
 * marked, because "when" is the only axis that matters here.
 *
 * Earnings can be real (Finnhub); the other two are always simulated, and the
 * SourceTag on each says which is which.
 */

const TABS = ["Earnings", "Economic", "IPO"] as const;
type Tab = (typeof TABS)[number];

/**
 * The date window, resolved after mount.
 *
 * "Today" can't be read during render: these routes prerender, so the server
 * would bake its own date into the HTML and disagree with the client on the
 * first paint. Same reason the status-bar clock waits for mount. Until it
 * resolves the range is null, the queries stay disabled, and panels show
 * skeletons.
 */
function useRange(daysBack: number, daysForward: number): DateRange & { today: string } {
  const [range, setRange] = useState<DateRange & { today: string }>({ from: "", to: "", today: "" });

  useEffect(() => {
    const resolve = () => {
      const day = 86_400_000;
      const now = Date.now();
      setRange({
        from: new Date(now - daysBack * day).toISOString().slice(0, 10),
        to: new Date(now + daysForward * day).toISOString().slice(0, 10),
        today: new Date(now).toISOString().slice(0, 10),
      });
    };
    resolve();
  }, [daysBack, daysForward]);

  return range;
}

export function CalendarsModule() {
  const mod = MODULES.find((m) => m.id === "calendars");
  const [tab, setTab] = useState<Tab>("Earnings");

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 flex shrink-0 items-baseline gap-3">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">{mod?.code ?? "CAL"}</span>
        <h1 className="text-base font-semibold text-fg">{mod?.label ?? "Calendars"}</h1>
        <span className="hidden text-sm text-fg-faint sm:inline">{mod?.blurb}</span>
      </div>

      <div role="tablist" aria-label="Calendars" className="mb-3 flex shrink-0 items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            onClick={() => setTab(t)}
            className={cn(
              "px-2 py-1 text-xs font-medium transition-colors",
              t === tab ? "bg-amber/15 text-amber" : "text-fg-dim hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Earnings" && <EarningsPanel />}
      {tab === "Economic" && <EconomicPanel />}
      {tab === "IPO" && <IpoPanel />}
    </div>
  );
}

function EarningsPanel() {
  const range = useRange(3, 28);
  const { data, isPending } = useEarningsCalendar(range);
  const openWorkspace = useUIStore((s) => s.openWorkspace);
  const events = data?.data ?? [];

  return (
    <Panel
      title="Earnings"
      eyebrow={`${range.from} → ${range.to}`}
      className="min-h-0 flex-1"
      actions={<SourceTag source={data?.source} provider={data?.provider} />}
      scroll
    >
      {isPending ? (
        <SkeletonRows rows={8} />
      ) : events.length === 0 ? (
        <Empty>No earnings scheduled in this window.</Empty>
      ) : (
        <GroupedByDate items={events} dateOf={(e) => e.date} today={range.today}>
          {(e: EarningsEvent) => (
            <>
              <button
                type="button"
                onClick={() => openWorkspace(e.symbol)}
                className="w-16 shrink-0 text-left font-mono text-sm font-medium text-fg transition-colors hover:text-amber"
                title={`Open ${e.symbol} workspace`}
              >
                {e.symbol}
              </button>
              <span className="min-w-0 flex-1 truncate text-sm text-fg-dim">{symbolName(e.symbol)}</span>
              <span className="shrink-0 font-mono text-2xs text-fg-faint">{sessionLabel(e.time)}</span>
              <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums text-fg-dim">
                {e.epsEstimate !== undefined ? `est ${e.epsEstimate.toFixed(2)}` : "—"}
              </span>
              <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums">
                {e.epsActual !== undefined ? (
                  <span className={e.epsActual >= (e.epsEstimate ?? 0) ? "text-up" : "text-down"}>
                    act {e.epsActual.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-fg-faint">—</span>
                )}
              </span>
            </>
          )}
        </GroupedByDate>
      )}
    </Panel>
  );
}

function EconomicPanel() {
  const range = useRange(3, 21);
  const { data, isPending } = useEconomicCalendar(range);
  const events = data?.data ?? [];

  return (
    <Panel
      title="Economic Releases"
      eyebrow={`${range.from} → ${range.to}`}
      className="min-h-0 flex-1"
      actions={<SourceTag source={data?.source} provider={data?.provider} />}
      scroll
    >
      {isPending ? (
        <SkeletonRows rows={8} />
      ) : events.length === 0 ? (
        <Empty>No releases in this window.</Empty>
      ) : (
        <GroupedByDate items={events} dateOf={(e) => e.date} today={range.today}>
          {(e: EconomicEvent) => (
            <>
              <span className="w-16 shrink-0 font-mono text-2xs text-fg-faint">{e.time ?? "—"}</span>
              <ImpactDot impact={e.impact} />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{e.title}</span>
              <Figure label="prev" value={e.previous} unit={e.unit} />
              <Figure label="fcst" value={e.forecast} unit={e.unit} />
              {/* An actual only exists once the release has happened. */}
              <Figure label="act" value={e.actual} unit={e.unit} emphasis />
            </>
          )}
        </GroupedByDate>
      )}
    </Panel>
  );
}

function IpoPanel() {
  const range = useRange(14, 45);
  const { data, isPending } = useIpoCalendar(range);
  const events = data?.data ?? [];

  return (
    <Panel
      title="IPO Calendar"
      eyebrow={`${range.from} → ${range.to}`}
      className="min-h-0 flex-1"
      actions={<SourceTag source={data?.source} provider={data?.provider} />}
      scroll
    >
      {isPending ? (
        <SkeletonRows rows={6} />
      ) : events.length === 0 ? (
        <Empty>No offerings in this window.</Empty>
      ) : (
        <GroupedByDate items={events} dateOf={(e) => e.date} today={range.today}>
          {(e: IpoEvent) => (
            <>
              <span className="w-16 shrink-0 font-mono text-sm font-medium text-fg">{e.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg-dim">{e.company}</span>
              <span className="w-16 shrink-0 font-mono text-2xs text-fg-faint">{e.exchange}</span>
              <span className="w-28 shrink-0 text-right font-mono text-xs tabular-nums text-fg-dim">
                {e.priceLow !== undefined && e.priceHigh !== undefined
                  ? `${formatPrice(e.priceLow)}–${formatPrice(e.priceHigh)}`
                  : "—"}
              </span>
              <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-fg-faint">
                {e.shares ? formatCompact(e.shares) : "—"}
              </span>
              <StatusTag status={e.status} />
            </>
          )}
        </GroupedByDate>
      )}
    </Panel>
  );
}

/** Rows under a sticky date heading, with today called out. */
function GroupedByDate<T>({
  items,
  dateOf,
  today,
  children,
}: {
  items: T[];
  dateOf: (item: T) => string;
  /** Passed in, not read from the clock — render must stay pure. */
  today: string;
  children: (item: T) => React.ReactNode;
}) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const dates = [...groups.keys()].sort();

  return (
    <div>
      {dates.map((date) => (
        <section key={date}>
          <h3 className="sticky top-0 z-10 flex items-center gap-2 border-y border-line bg-elevated px-3 py-1">
            <span className="eyebrow">{formatDateHeading(date)}</span>
            {date === today && <span className="font-mono text-2xs font-bold text-amber">TODAY</span>}
          </h3>
          <ul>
            {groups.get(date)!.map((item, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-line px-3 py-1.5 last:border-0 hover:bg-elevated">
                {children(item)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Figure({
  label,
  value,
  unit,
  emphasis = false,
}: {
  label: string;
  value?: number;
  unit?: string;
  emphasis?: boolean;
}) {
  return (
    <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
      <span className="mr-1 text-2xs text-fg-faint">{label}</span>
      <span className={value === undefined ? "text-fg-faint" : emphasis ? "text-fg" : "text-fg-dim"}>
        {value === undefined ? "—" : `${value}${unit ?? ""}`}
      </span>
    </span>
  );
}

const IMPACT_STYLES: Record<EventImpact, string> = {
  high: "bg-down",
  medium: "bg-amber",
  low: "bg-flat",
};

/** Impact is never colour-alone: the dot carries a title and a text label. */
function ImpactDot({ impact }: { impact: EventImpact }) {
  return (
    <span className="flex w-16 shrink-0 items-center gap-1.5" title={`${impact} impact`}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", IMPACT_STYLES[impact])} aria-hidden />
      <span className="text-2xs uppercase text-fg-faint">{impact}</span>
    </span>
  );
}

function StatusTag({ status }: { status: IpoEvent["status"] }) {
  return (
    <span
      className={cn(
        "w-20 shrink-0 border px-1 py-px text-center font-mono text-2xs uppercase",
        status === "priced"
          ? "border-up/40 text-up"
          : status === "withdrawn"
            ? "border-down/40 text-down"
            : "border-line text-fg-dim",
      )}
    >
      {status}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-sm text-fg-faint">{children}</p>;
}

function sessionLabel(time?: EarningsEvent["time"]): string {
  return time === "bmo" ? "pre-mkt" : time === "amc" ? "post-mkt" : time === "dmh" ? "intraday" : "—";
}

function formatDateHeading(date: string): string {
  // Parsed as UTC to avoid the local-timezone off-by-one on a date-only string.
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
