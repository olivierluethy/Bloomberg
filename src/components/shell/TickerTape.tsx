"use client";

import { useQuotes } from "@/data/hooks";
import { MARKETS_SUMMARY } from "@/config/universes";
import { formatPercent, formatPrice, priceDigits } from "@/lib/format";
import type { Quote } from "@/data/types";

/**
 * The top strip: one scrolling line of symbol / price / %chg separated by " | ".
 * Amber symbol, white price, green-or-red change.
 *
 * This replaced a row of card tiles. It reads the same MARKETS_SUMMARY universe
 * through the same `useQuotes` hook the tiles used, so it is a re-presentation
 * of existing data, not a new feed.
 */
export function TickerTape() {
  const results = useQuotes(MARKETS_SUMMARY);

  const items = MARKETS_SUMMARY.map((symbol, i) => ({
    symbol,
    quote: results[i]?.data?.data,
  })).filter((t): t is { symbol: string; quote: Quote } => Boolean(t.quote));

  // Hold the strip's height while the first quotes are in flight, so the whole
  // top bar doesn't reflow the moment they land.
  if (items.length === 0) {
    return <div className="h-full flex-1" aria-hidden />;
  }

  const strip = items.map((t) => <TickerItem key={t.symbol} symbol={t.symbol} quote={t.quote} />);

  return (
    <div className="ticker-tape min-w-0 flex-1 overflow-hidden" aria-label="Market ticker">
      <div className="ticker-scroll">
        {strip}
        {/*
          The strip is duplicated so the -50% translate lands the copy exactly
          where the original started. aria-hidden because it is the same data
          twice — a screen reader should hear the instruments once.
        */}
        <span aria-hidden className="inline-flex">
          {strip}
        </span>
      </div>
    </div>
  );
}

function TickerItem({ symbol, quote }: { symbol: string; quote: Quote }) {
  const dir = quote.changePercent >= 0 ? "text-up" : "text-down";
  return (
    <span className="inline-flex shrink-0 items-center gap-1 px-1.5 text-xs">
      <span className="text-amber">{symbol}</span>
      <span className="text-fg tabular-nums">
        {formatPrice(quote.price, priceDigits(symbol, quote.price))}
      </span>
      <span className={`${dir} tabular-nums`}>{formatPercent(quote.changePercent)}</span>
      <span className="pl-1.5 text-line" aria-hidden>
        |
      </span>
    </span>
  );
}
