"use client";

import { Panel } from "@/components/primitives/Panel";
import { DataCell } from "@/components/primitives/DataCell";
import { SourceTag } from "@/components/primitives/SourceTag";
import { SkeletonText } from "@/components/primitives/Skeleton";
import { useOrderBook, useQuote } from "@/data/hooks";
import { formatPercent, formatPrice } from "@/lib/format";
import type { Quote, Sourced } from "@/data/types";
import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Phase 2 smoke test. Proves that a real source (CoinGecko, live) and a
 * simulated source (mock) both flow through the identical MarketDataProvider
 * interface and TanStack Query hooks — the UI code is agnostic to which is which.
 */
export function DataLab() {
  const btc = useQuote("BTC-USD"); // routes to CoinGecko → LIVE (keyless)
  const aapl = useQuote("AAPL"); // no Finnhub key here → falls back to SIM
  const book = useOrderBook("BTC-USD"); // always simulated

  return (
    <div className="flex h-full flex-col overflow-auto p-3">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">LAB</span>
        <h1 className="text-base font-semibold text-fg">Data Layer Smoke Test</h1>
        <span className="text-sm text-fg-faint">
          One interface, two sources — the panels below don&apos;t know which is which.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <QuoteCard
          title="Live Path"
          eyebrow="Crypto · CoinGecko"
          note="Real quote via the keyless public tier."
          query={btc}
        />
        <QuoteCard
          title="Fallback Path"
          eyebrow="Equity · Finnhub → Mock"
          note="No API key present, so the router degrades to a labeled mock."
          query={aapl}
        />

        <Panel
          title="Order Book"
          eyebrow="Always Simulated"
          actions={<SourceTag source={book.data?.source} provider={book.data?.provider} />}
        >
          <div className="p-3">
            {book.isPending ? (
              <SkeletonText lines={6} />
            ) : book.data ? (
              <OrderBookView data={book.data.data} />
            ) : (
              <ErrorLine message={(book.error as Error)?.message} />
            )}
          </div>
        </Panel>
      </div>

      <p className="mt-3 max-w-3xl text-sm text-fg-dim">
        The <span className="text-fg">Live</span> and <span className="text-fg">Fallback</span>{" "}
        panels call the exact same <code className="font-mono text-cyan">useQuote()</code> hook.
        Routing to a real adapter vs. the mock happens on the server, and the only visible
        difference is the provenance tag. Provide{" "}
        <code className="font-mono text-cyan">FINNHUB_API_KEY</code> in{" "}
        <code className="font-mono text-cyan">.env.local</code> and the equity panel flips to LIVE
        — no component changes.
      </p>
    </div>
  );
}

function QuoteCard({
  title,
  eyebrow,
  note,
  query,
}: {
  title: string;
  eyebrow: string;
  note: string;
  query: UseQueryResult<Sourced<Quote>>;
}) {
  return (
    <Panel
      title={title}
      eyebrow={eyebrow}
      actions={<SourceTag source={query.data?.source} provider={query.data?.provider} />}
    >
      <div className="p-3">
        {query.isPending ? (
          <SkeletonText lines={4} />
        ) : query.data ? (
          <QuoteView quote={query.data.data} note={note} />
        ) : (
          <ErrorLine message={(query.error as Error)?.message} />
        )}
      </div>
    </Panel>
  );
}

function QuoteView({ quote, note }: { quote: Quote; note: string }) {
  const dir = quote.changePercent >= 0 ? "up" : "down";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold text-fg">{quote.symbol}</span>
        <span className="text-2xs text-fg-faint">{quote.currency}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <DataCell
          value={quote.price}
          display={formatPrice(quote.price)}
          color="none"
          className="px-0 text-2xl text-fg"
        />
        <DataCell value={quote.changePercent} display={formatPercent(quote.changePercent)} color={dir} />
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm tabular-nums">
        <Stat label="Open" value={formatPrice(quote.open)} />
        <Stat label="Prev" value={formatPrice(quote.previousClose)} />
        <Stat label="High" value={formatPrice(quote.high)} />
        <Stat label="Low" value={formatPrice(quote.low)} />
      </dl>
      <p className="mt-1 text-2xs text-fg-faint">{note}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-line py-0.5">
      <dt className="text-fg-faint">{label}</dt>
      <dd className="text-fg">{value}</dd>
    </div>
  );
}

function OrderBookView({ data }: { data: { bids: { price: number; size: number }[]; asks: { price: number; size: number }[] } }) {
  const rows = Math.min(6, data.bids.length, data.asks.length);
  return (
    <div className="grid grid-cols-2 gap-3 font-mono text-sm tabular-nums">
      <div>
        <div className="eyebrow mb-1 text-up">Bids</div>
        {data.bids.slice(0, rows).map((b, i) => (
          <div key={i} className="flex justify-between border-b border-line py-0.5">
            <span className="text-up">{formatPrice(b.price)}</span>
            <span className="text-fg-dim">{b.size.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="eyebrow mb-1 text-down">Asks</div>
        {data.asks.slice(0, rows).map((a, i) => (
          <div key={i} className="flex justify-between border-b border-line py-0.5">
            <span className="text-down">{formatPrice(a.price)}</span>
            <span className="text-fg-dim">{a.size.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorLine({ message }: { message?: string }) {
  return <p className="font-mono text-sm text-down">error: {message ?? "unknown"}</p>;
}
