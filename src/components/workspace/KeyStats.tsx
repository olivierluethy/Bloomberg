"use client";

import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/primitives/Skeleton";
import { useFundamentals, useQuote } from "@/data/hooks";
import { classifySymbol } from "@/data/provider";
import { formatCompact, formatPrice, priceDigits } from "@/lib/format";

/**
 * The session/valuation rail of the workspace: today's numbers from the quote,
 * valuation from fundamentals, and a 52-week range bar placing the last price
 * between its extremes.
 *
 * Only the fields a given asset class actually has are rendered — a forex pair
 * has no market cap, and pretending otherwise with a dash for every row would
 * be noise.
 */
export function KeyStats({ symbol }: { symbol: string }) {
  const { data: quoteData, isPending: quotePending } = useQuote(symbol);
  const { data: fundData, isPending: fundPending } = useFundamentals(symbol);

  const quote = quoteData?.data;
  const fundamentals = fundData?.data;
  const cls = classifySymbol(symbol);
  const digits = priceDigits(symbol, quote?.price);
  // Valuation metrics only mean something for company-like instruments.
  const hasValuation = cls === "stock" || cls === "etf";

  return (
    <div className="flex flex-col">
      <Section title="Session">
        {quotePending || !quote ? (
          <StatSkeleton rows={5} />
        ) : (
          <dl className="grid grid-cols-2 gap-x-3">
            <Stat label="Open" value={formatPrice(quote.open, digits)} />
            <Stat label="Prev Close" value={formatPrice(quote.previousClose, digits)} />
            <Stat label="High" value={formatPrice(quote.high, digits)} />
            <Stat label="Low" value={formatPrice(quote.low, digits)} />
            {quote.volume ? <Stat label="Volume" value={formatCompact(quote.volume)} /> : null}
            <Stat label="Currency" value={quote.currency} />
          </dl>
        )}
      </Section>

      {fundPending ? (
        <Section title="Valuation">
          <StatSkeleton rows={4} />
        </Section>
      ) : fundamentals ? (
        <>
          {fundamentals.low52 !== undefined && fundamentals.high52 !== undefined && quote ? (
            <Section title="52-Week Range">
              <RangeBar low={fundamentals.low52} high={fundamentals.high52} last={quote.price} digits={digits} />
            </Section>
          ) : null}

          {hasValuation ? (
            <Section title="Valuation">
              <dl className="grid grid-cols-2 gap-x-3">
                {fundamentals.marketCap ? (
                  <Stat label="Mkt Cap" value={formatCompact(fundamentals.marketCap)} />
                ) : null}
                {fundamentals.peRatio ? <Stat label="P/E" value={fundamentals.peRatio.toFixed(1)} /> : null}
                {fundamentals.eps !== undefined ? <Stat label="EPS" value={fundamentals.eps.toFixed(2)} /> : null}
                {fundamentals.beta !== undefined ? <Stat label="Beta" value={fundamentals.beta.toFixed(2)} /> : null}
                {fundamentals.dividendYield !== undefined ? (
                  <Stat label="Div Yield" value={`${fundamentals.dividendYield.toFixed(2)}%`} />
                ) : null}
              </dl>
            </Section>
          ) : null}

          {fundamentals.sector || fundamentals.industry ? (
            <Section title="Classification">
              <dl className="grid grid-cols-1 gap-x-3">
                {fundamentals.sector ? <Stat label="Sector" value={fundamentals.sector} /> : null}
                {fundamentals.industry ? <Stat label="Industry" value={fundamentals.industry} /> : null}
              </dl>
            </Section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-2 last:border-0">
      <h3 className="eyebrow mb-1.5">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <dt className="shrink-0 text-xs text-fg-faint">{label}</dt>
      <dd className="truncate font-mono text-xs tabular-nums text-fg">{value}</dd>
    </div>
  );
}

/** Where the last price sits between the 52-week extremes. */
function RangeBar({ low, high, last, digits }: { low: number; high: number; last: number; digits: number }) {
  const span = high - low;
  // Clamp: mock highs/lows are generated independently of the walked price, so
  // the last price can fall outside the band. Real feeds can lag intraday too.
  const pct = span > 0 ? Math.min(100, Math.max(0, ((last - low) / span) * 100)) : 50;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-1.5 bg-elevated">
        <div className="absolute inset-y-0 left-0 bg-line-bright" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-amber"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between font-mono text-2xs tabular-nums text-fg-faint">
        <span>{formatPrice(low, digits)}</span>
        <span className={cn(pct > 50 ? "text-up" : "text-down")}>{formatPrice(last, digits)}</span>
        <span>{formatPrice(high, digits)}</span>
      </div>
    </div>
  );
}

function StatSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}
