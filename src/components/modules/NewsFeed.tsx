"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/primitives/Panel";
import { SourceTag } from "@/components/primitives/SourceTag";
import { SkeletonRows } from "@/components/primitives/Skeleton";
import { useNews } from "@/data/hooks";
import { formatRelativeTime } from "@/lib/format";
import type { NewsItem } from "@/data/types";

/**
 * Financial news feed. Standalone it's the News module (category filter + full
 * list); with `compact` + a `symbol` it's the embeddable "related news" list the
 * asset detail workspace (Phase 7) reuses. Real source via the data layer
 * (NewsAPI → Finnhub), labeled mock fallback — same SourceTag convention.
 */

const CATEGORIES = ["All", "Markets", "Earnings", "Macro", "Tech", "Energy"] as const;

export function NewsFeed({
  symbol,
  compact = false,
  limit,
}: {
  symbol?: string;
  compact?: boolean;
  limit?: number;
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const { data, isPending, isError, error } = useNews({
    symbol,
    category: category === "All" ? undefined : category,
    limit: limit ?? (compact ? 8 : 30),
  });
  const items = data?.data ?? [];

  // Compact: just the list, for embedding inside someone else's panel.
  if (compact) {
    return <NewsList items={items} isPending={isPending} isError={isError} compact />;
  }

  return (
    <div className="flex h-full flex-col p-1">
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">N</span>
        <h1 className="text-xs font-bold uppercase text-amber2">News</h1>
        <span className="text-2xs text-fg-dim">Live financial headlines</span>
        <div className="ml-auto">
          <SourceTag source={data?.source} provider={data?.provider} />
        </div>
      </div>

      <div className="mb-1 flex items-center gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={c === category}
            className={cn(
              "px-1.5 py-1 text-xs font-medium transition-colors",
              c === category ? "bg-amber/15 text-amber" : "text-fg-dim hover:text-fg",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <Panel tag="N" title="Headlines" eyebrow="Feed" className="min-h-0 flex-1" scroll>
        <NewsList items={items} isPending={isPending} isError={isError} error={error as Error | null} />
      </Panel>
    </div>
  );
}

function NewsList({
  items,
  isPending,
  isError,
  error,
  compact = false,
}: {
  items: NewsItem[];
  isPending: boolean;
  isError?: boolean;
  error?: Error | null;
  compact?: boolean;
}) {
  if (isPending) return <SkeletonRows rows={compact ? 5 : 10} />;
  if (isError) {
    return <p className="p-1 font-mono text-sm text-down">Couldn&apos;t load news: {error?.message ?? "unknown error"}</p>;
  }
  if (items.length === 0) {
    return <p className="p-1 text-sm text-fg-faint">No headlines right now.</p>;
  }
  return (
    <ul>
      {items.map((item) => (
        <NewsRow key={item.id} item={item} compact={compact} />
      ))}
    </ul>
  );
}

function NewsRow({ item, compact }: { item: NewsItem; compact: boolean }) {
  const inner = (
    <>
      <time className="w-10 shrink-0 pt-0.5 font-mono text-2xs text-fg-faint">
        {formatRelativeTime(item.publishedAt)}
      </time>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-fg transition-colors group-hover:text-amber">{item.headline}</p>
        {!compact && item.summary ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-fg-dim">{item.summary}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs">
          <span className="text-fg-dim">{item.source}</span>
          {item.category ? <span className="eyebrow border border-line px-1 py-px">{item.category}</span> : null}
          {item.tickers?.map((t) => (
            <span key={t} className="text-amber">
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  const className = "group flex gap-1.5 border-b border-line px-1.5 py-0.5 last:border-0 hover:bg-elevated";
  return (
    <li>
      {item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}>
          {inner}
        </a>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}
