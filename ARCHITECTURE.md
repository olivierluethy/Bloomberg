# TERM — Architecture

> **Status: built.** Phases 0–11 are complete. This began as a Phase 0 plan written
> before any code existed; it's kept as the design record, updated where the build
> taught us something the plan didn't know. The phase table at §6 is now a log
> rather than a forecast, and §7's open questions are answered.
>
> For how to run it, see [README.md](./README.md).

## Build notes — what the plan got wrong

Worth recording, because every one of these cost real debugging time:

- **The simulator was the main source of bugs, not the real adapters.** Wrong
  simulated data looks exactly like right simulated data, and nothing fails. A
  price sat above its own 52-week high; CPI and the unemployment rate rendered as
  the same line; the yield curve came out a scribble because ten maturities each
  walked independently; an IPO priced on a Saturday. All were found by *reading
  the rendered screen*, none by the type system. The invariants are now pinned in
  `src/data/adapters/mock.test.ts`.
- **Framer Motion ignores the reduced-motion CSS rule.** The `@media
  (prefers-reduced-motion)` block in `globals.css` only neutralises CSS
  animations; JS-driven transforms sail straight past it. Every animated
  component has to check `useReducedMotion()` itself.
- **Reopening an overlay during its exit animation reuses the component.**
  AnimatePresence interrupts the exit rather than remounting, so state that was
  assumed to reset on unmount silently survives. Overlay bodies are keyed by an
  open counter for this reason.
- **`ResponsiveContainer` collapses to zero inside a `min-h-0` flex column,** and
  a Recharts bar with no category axis renders at zero height. Both produced
  charts that were structurally present and completely invisible — a test that
  counts SVG nodes passes right through it.
- **A design token copied as a hex literal will drift.** The chart axes kept the
  old grey after the text ramp was raised for contrast, leaving the labels at
  2.5:1 while the rest of the app was fixed. `ChartCanvas` now *reads* the tokens
  at mount via `getComputedStyle` rather than copying them, because
  lightweight-charts paints to a canvas and can't resolve `var()` itself.
- **An intrinsically-wide child silently resizes a whole CSS grid.** The shell's
  `grid` had no explicit column, so its implicit `auto` column sized to
  max-content — and the ticker tape's duplicated marquee strip is ~2200px wide
  intrinsically. Every row inherited that width and the right-hand panels were
  pushed off the viewport. `grid-cols-1` (i.e. `minmax(0, 1fr)`) is the fix. The
  build, the typecheck and the tests were all green while this was broken; only a
  screenshot showed it.

## Deliberate accessibility regression — amber on blue

The reskin to the Bloomberg visual grammar puts bold amber2 (`#ffb700`) text on
solid blue (`#0068ff`) panel-header bars. That measures **2.71:1**, under the
WCAG AA 4.5:1 floor that the text ramp was specifically rebuilt to clear.

This is a decision, not an oversight: authenticity was chosen over the audit,
because the real terminal looks exactly like this. It is the *only* remaining
violation — an axe `wcag2aa` pass over `/`, `/stocks`, `/portfolio`, `/economy`
and `/news` reports `color-contrast` and nothing else, and every node is this one
pair. Two failures that were *not* deliberate were found by that pass and fixed:
grey on the blue bar (the watchlist EDIT button) and blue text on black at
4.42:1 (news tickers) — blue is a bar fill in this design, never ink.

If the trade is ever revisited, darkening `--color-blue` until it clears 4.5:1
is the cheapest fix that keeps the amber-on-blue signature. Everything else
clears AA on black: amber 8.8:1, amber2 12.0:1, white 21:1, grey 4.8:1,
green 9.6:1, red 5.3:1.

---

## 1. Confirmed stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16 (App Router)** | React Server Components where useful; most panels are client components (live data, charts). |
| Language | **TypeScript, `strict: true`** | `noUncheckedIndexedAccess` on too. No `any` without a justifying comment. |
| Styling | **Tailwind CSS v4** | Tailwind-only. Dark mode only — no `dark:` variants needed, the base theme *is* dark. True-black Bloomberg grammar: amber is the default ink, blue header bars, zero border-radius app-wide, monospace throughout. |
| Server state | **TanStack Query v5** | All API/mock reads. Owns caching, stale time, retry/backoff. |
| Client/UI state | **Zustand** | Layout, active panel, watchlists, workspace arrangement, modal stack. Persisted slices via `persist` middleware → `localStorage`. |
| Charts (price) | **TradingView Lightweight Charts** | OHLCV, candles, overlays. One `<PriceChart/>`, reused everywhere. |
| Charts (analytical) | **Recharts** | Portfolio allocation / sector exposure / macro series only. |
| Animation | **Framer Motion** | Panel mount/unmount, tab/modal transitions. |
| Fake data | **@faker-js/faker** | Deterministic seeding so mocks are stable across renders. |
| Package manager | **pnpm** | pnpm 9, Node 20+ (22 recommended). |
| Tests | **Vitest** | Added in Phase 11 for the pure layers; the UI is verified by driving the real app. |

**Rationale for the RSC-light stance:** this is a live-data terminal. Almost every panel
subscribes to changing quotes, so trying to render them on the server buys little and
complicates the data layer. Server Components are used for static shells/layouts; data panels
are `'use client'` and go through TanStack Query.

---

## 2. Free-API reality check (2026) — the important part

Several APIs that tutorials still recommend have moved core endpoints behind paywalls. Verified
intent for each; **assume every "real" call must degrade gracefully to a mock** (Phase 2 requires
this anyway). Keys go in `.env.local`, never committed.

| Provider | Free tier | Use for | Caveat |
| --- | --- | --- | --- |
| **Finnhub** | ~60 req/min, no card | Stock quote, company profile, company news, earnings calendar | **Stock candles are now premium** — do *not* rely on Finnhub for OHLCV. |
| **Twelve Data** | ~800 req/day, 8 req/min | **OHLCV time series** (stocks/ETF/index/forex), quotes | This is our primary charting source. Rate limit is the binding constraint → aggressive caching. |
| **CoinGecko** | ~10–30 req/min, demo key | Crypto quotes + OHLC | No card. Generous. Own endpoint shape (not OHLCV-standard) → adapter normalizes. |
| **FRED** (St. Louis Fed) | Very generous, free key | Macro series: CPI, unemployment, GDP, Fed funds, treasury yields | Series-based, not tickers. Powers the Phase 9 economic dashboard. |
| **NewsAPI.org** | 100 req/day, localhost-only dev key | Phase 5 news feed | Dev key blocks production domains — fine for a reference/hackathon build; mock fallback covers the rest. |

**Always-mocked (no viable free real source):** order books / Level II, option chains, analyst
estimates, ownership structure, IPO calendar. These are generated with Faker under
internal-consistency rules (bid < ask, monotonic-ish price walks, weights that sum to 100%).

> **Decided:** OHLCV comes from **Twelve Data**, not Finnhub. Swapping in a paid
> Finnhub/Polygon/Alpha Vantage key is a one-adapter change — the interface below is what makes
> that true, and it held: CoinGecko, FRED and NewsAPI were all added without touching a component.

---

## 3. The data-provider interface (the load-bearing abstraction)

Every module calls this interface. **No component ever calls `fetch()` or Faker directly.** Each
method returns data plus a provenance tag so the dev-only live/simulated indicator is free.

```ts
// Every result is wrapped so the UI always knows where a number came from.
type Provenance = 'live' | 'simulated' | 'cached';
type Sourced<T> = { data: T; source: Provenance; provider: string; asOf: number };

interface MarketDataProvider {
  getQuote(symbol: string): Promise<Sourced<Quote>>;
  getOHLCV(symbol: string, range: Range, interval: Interval): Promise<Sourced<Candle[]>>;
  getOrderBook(symbol: string, depth?: number): Promise<Sourced<OrderBook>>;   // mock
  getNews(params: NewsQuery): Promise<Sourced<NewsItem[]>>;
  getFundamentals(symbol: string): Promise<Sourced<Fundamentals>>;
  getAnalystEstimates(symbol: string): Promise<Sourced<AnalystEstimates>>;     // mock
  getOwnership(symbol: string): Promise<Sourced<Ownership>>;                    // mock
  getEconomicSeries(seriesId: string): Promise<Sourced<EconPoint[]>>;          // FRED
  getEarningsCalendar(range: DateRange): Promise<Sourced<EarningsEvent[]>>;
  getEconomicCalendar(range: DateRange): Promise<Sourced<EconomicEvent[]>>;  // mock (Phase 9)
  getIpoCalendar(range: DateRange): Promise<Sourced<IpoEvent[]>>;            // mock (Phase 9)
  search(query: string): Promise<Sourced<SearchResult[]>>;
}
```

**Composition, not inheritance.** A single `RoutingProvider` implements the interface and
dispatches each `(method, assetClass)` pair to a concrete adapter, with an automatic mock
fallback on error/rate-limit:

```
Component → useQuote() hook (TanStack Query) → RoutingProvider → { FinnhubAdapter,
  TwelveDataAdapter, CoinGeckoAdapter, FredAdapter, NewsAdapter } → (on failure) → MockAdapter
```

Every adapter maps its raw payload into our normalized types, so swapping providers never touches
a component. TanStack Query keys are `[method, ...args]`, so caching/dedup/backoff live in one place.

> **Decided:** the fallback is *silent* but *labeled* — the datum falls back to `simulated` and
> its SourceTag says so. This proved right in practice: CoinGecko rate-limits (429) constantly
> during development, and a toast per degraded panel would have been unusable noise.

---

## 4. Target folder structure

```
src/
  app/
    layout.tsx                 # root shell: command bar, left nav, status bar, providers
    page.tsx                   # Markets overview (default module)
    stocks/ etfs/ …            # one route per module (flat; no route group was needed)
      stocks/page.tsx
      etfs/page.tsx
      indices/page.tsx
      commodities/page.tsx
      bonds/page.tsx
      forex/page.tsx
      crypto/page.tsx
      economy/page.tsx
      portfolio/page.tsx
      calendars/page.tsx
    globals.css                # Tailwind entry + design tokens
  components/
    shell/                     # CommandBar, LeftNav, StatusBar, PanelGrid
    primitives/                # ResizablePanel, Skeleton, Modal, Sparkline, DataCell
    charts/                    # PriceChart (TV Lightweight), indicator overlays
    modules/                   # per-module panel components
    search/                    # command palette (Cmd/Ctrl+K)
    workspace/                 # asset-detail workspace overlay, draggable layout
  data/
    types.ts                   # normalized domain types (Quote, Candle, ...)
    provider.ts                # MarketDataProvider interface + RoutingProvider
    adapters/                  # finnhub.ts, twelveData.ts, coinGecko.ts, fred.ts, news.ts, mock.ts
    hooks/                     # useQuote, useOHLCV, useNews, ... (TanStack Query wrappers)
  store/                       # Zustand slices: layout, watchlists, workspace, ui
  lib/                         # env parsing, formatters (numbers/currency), query client
  config/                      # tailwind tokens, module registry, keyboard-shortcut map
```

**Module registry** (`config/modules.ts`) is the single source of truth for nav items, routes,
icons, and which asset class each maps to — nav, routing, and the command palette all read from it,
so adding a module is one entry, not four edits.

---

## 5. State ownership (avoids the prop-drilling weakness the original plan worried about)

- **TanStack Query** owns everything fetched: quotes, candles, news, fundamentals. Components
  subscribe via hooks; no server data ever lives in Zustand.
- **Zustand** owns only local truth: active module, panel sizes, watchlists, workspace layout,
  modal stack, keyboard-shortcut state. `watchlists`, `layout`, and `workspace` slices persist to
  `localStorage`; `ui`/modal state does not.
- **No React Context for data.** The query client and provider are injected once at the root.

---

## 6. Phase-by-phase build log

All phases are complete. Each ended with a green build, Conventional Commits, and a
written summary of what was real vs mocked.

| Phase | Delivered | |
| --- | --- | --- |
| **0** | Architecture plan + folder structure + API selection. | ✅ |
| **1** | Scaffold Next.js/TS/Tailwind, design tokens, app shell, `ResizablePanel`, skeletons, motion set. Static placeholder data. | ✅ |
| **2** | Data layer: interface, `RoutingProvider`, Finnhub + Twelve Data + CoinGecko + FRED adapters, Faker mocks, TanStack Query config, dev provenance indicator, one proof-of-life test panel. | ✅ |
| **3** | 8 asset-class panels (quote + sparkline + sortable list), lazy-loaded, skeletons. | ✅ |
| **4** | `<PriceChart/>` — candles/volume/zoom/crosshair + SMA/EMA/Bollinger/RSI/MACD overlays. | ✅ |
| **5** | News feed panel → NewsAPI with mock fallback. | ✅ |
| **6** | Cmd/Ctrl+K command palette + watchlists (create/pin/reorder, modal editing). | ✅ |
| **7** | Asset-detail workspace as modal overlay (chart + stats + fundamentals + related news + mocked estimates/ownership). | ✅ |
| **8** | Virtual portfolio — **real** weighted-return & cost-basis math over (possibly mocked) instruments; Recharts allocation/exposure. | ✅ |
| **9** | Economic dashboard (FRED) + earnings/economic/IPO calendars. | ✅ |
| **10** | Keyboard workflow, draggable persisted layout, transition/empty-state polish. No new data. | ✅ |
| **11** | Hardening: dedup, type/accessibility/lazy-loading audit, zero TS errors, README. | ✅ |

Two additions the plan didn't foresee, both added in Phase 11:

- **Vitest** over the pure layers (portfolio maths, simulator invariants, formatters,
  fuzzy matching). The plan had no testing story; the maths needed one.
- **Browser verification** per phase, driving the real app in headless Chrome. This is
  what caught the bugs the type system couldn't see, and it's the reason the phases
  above were signed off rather than assumed.

---

## 7. Decisions, as settled

The Phase 0 open questions, and how they turned out:

1. **OHLCV source = Twelve Data** (Finnhub candles went premium). Held — and the adapter
   boundary made the choice cheap to revisit. — §2
2. **Silent-but-labeled mock fallback.** Held, and vindicated: CoinGecko 429s are routine, and
   a toast per degraded panel would have been noise. — §3
3. **Tailwind v4.** Held, and vindicated twice. The `@theme` token block is the single
   source of truth for the palette, which is what made the Phase 11 contrast fix a
   two-line change — and later let the whole Bloomberg reskin land as a value remap
   in one file plus chrome work, rather than a hex-by-hex edit across 40 components.
   The token *names* were kept and only their values changed, which is why the diff
   is legible.
4. **Next.js over pure Vite/React.** Held. Route-level code splitting is real: Recharts
   (~390 kB) ships only on `/portfolio` and `/economy`; the price chart's canvas is behind
   `next/dynamic` and loads on demand.
5. **`git init` in Phase 1.** Done.

## 7a. Build environment

Node 20+ and pnpm 9. One local wrinkle worth recording: this repo lives on an **exFAT
volume**, which cannot build in place — exFAT rejects symlinks, which pnpm and
`node_modules/.bin` both require. Builds run from a copy on a local ext4 disk. `git config
core.fileMode false` is set for the same reason: exFAT reports every file as 0755 and
otherwise every file looks modified.

## 8. Top risks

- **Rate limits** (Twelve Data 8/min, NewsAPI 100/day) are the real constraint — mitigated by long
  stale times, request dedup, and mock fallback. A live terminal feel comes from *client-side*
  simulated ticks between real refreshes, not from hammering the APIs.
- **Scope creep across phase boundaries** (e.g. Phase 3 sprouting a chart) — the hard-stop gates exist
  precisely to catch this.
- **Mock/real consistency** — enforced by shared normalized types; a mock and a real adapter return
  the identical shape, so the UI can't tell them apart except via the provenance tag.
```
