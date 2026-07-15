# Bloomberg-Inspired Financial Dashboard — Architecture & Implementation Plan

> **Phase 0 deliverable — greenfield adaptation.** The original plan assumed an existing
> visual-only prototype to audit. The repository is empty, so there is nothing to audit;
> this document replaces "audit findings" with a from-scratch architecture plan and a
> phase-by-phase build order. **No code has been written.** Nothing here is final until you
> sign off — this is the cheapest point to redirect.

---

## 1. Confirmed stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router)** | React Server Components where useful; most panels are client components (live data, charts). |
| Language | **TypeScript, `strict: true`** | `noUncheckedIndexedAccess` on too. No `any` without a justifying comment. |
| Styling | **Tailwind CSS v4** | Tailwind-only. Dark mode only — no `dark:` variants needed, the base theme *is* dark. |
| Server state | **TanStack Query v5** | All API/mock reads. Owns caching, stale time, retry/backoff. |
| Client/UI state | **Zustand** | Layout, active panel, watchlists, workspace arrangement, modal stack. Persisted slices via `persist` middleware → `localStorage`. |
| Charts (price) | **TradingView Lightweight Charts** | OHLCV, candles, overlays. One `<PriceChart/>`, reused everywhere. |
| Charts (analytical) | **Recharts** | Portfolio allocation / sector exposure / macro series only. |
| Animation | **Framer Motion** | Panel mount/unmount, tab/modal transitions. |
| Fake data | **@faker-js/faker** | Deterministic seeding so mocks are stable across renders. |
| Package manager | **pnpm** | Detected locally (pnpm 9, Node 22). |

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

> **Decision to sanity-check #1:** OHLCV comes from **Twelve Data**, not Finnhub. If you have a
> paid Finnhub/Polygon/Alpha Vantage key, tell me and I'll make it the primary adapter — the
> interface below makes that a one-adapter swap.

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

> **Decision to sanity-check #2:** the fallback is *silent* to the user but *labeled* (the point
> falls back to `simulated` and the dev indicator shows it). Alternative is a visible toast on
> degradation. I'm defaulting to labeled-but-quiet.

---

## 4. Target folder structure

```
src/
  app/
    layout.tsx                 # root shell: command bar, left nav, status bar, providers
    page.tsx                   # Markets overview (default module)
    (modules)/                 # lazy-loaded, code-split routes per asset class
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

## 6. Phase-by-phase build order (greenfield-adapted)

| Phase | What it becomes on a greenfield repo | Ends with |
| --- | --- | --- |
| **0 (this doc)** | Architecture plan + folder structure + API selection. No code. | ⛔ your sign-off |
| **1** | Scaffold Next.js/TS/Tailwind, design tokens, app shell, `ResizablePanel`, skeletons, motion set. Static placeholder data. | build green + commit |
| **2** | Data layer: interface, `RoutingProvider`, Finnhub + Twelve Data + CoinGecko + FRED adapters, Faker mocks, TanStack Query config, dev provenance indicator, one proof-of-life test panel. | interface frozen |
| **3** | 8 asset-class panels (quote + sparkline + sortable list), lazy-loaded, skeletons. | spot-check real data |
| **4** | `<PriceChart/>` — candles/volume/zoom/crosshair + SMA/EMA/Bollinger/RSI/MACD overlays. | reused component |
| **5** | News feed panel → NewsAPI with mock fallback. | — |
| **6** | Cmd/Ctrl+K command palette + watchlists (create/pin/reorder, modal editing). | — |
| **7** | Asset-detail workspace as modal overlay (chart + stats + fundamentals + related news + mocked estimates/ownership). | — |
| **8** | Virtual portfolio — **real** weighted-return & cost-basis math over (possibly mocked) instruments; Recharts allocation/exposure. | — |
| **9** | Economic dashboard (FRED) + earnings/economic/IPO calendars. | — |
| **10** | Keyboard workflow, draggable persisted layout, transition/empty-state polish. No new data. | — |
| **11** | Hardening: dedup, type/accessibility/lazy-loading audit, zero TS errors, README. | reference-ready |

Each phase = one session, ends with build + Conventional Commit + a written summary of what's
real vs mocked, then **stops**. Phases 3–9 are reorderable (e.g. Charting before Core Modules) —
say the word and I'll swap the order.

---

## 7. Decisions I need you to sanity-check before Phase 1

1. **OHLCV source = Twelve Data** (Finnhub candles went premium). Swap if you have a paid key. — §2
2. **Silent-but-labeled mock fallback** vs a visible degradation toast. Defaulting to labeled-quiet. — §3
3. **Tailwind v4** (latest) vs v3 (more third-party examples). Defaulting to v4.
4. **Next.js over pure Vite/React.** The plan named Next; confirming, since it shapes routing/code-splitting.
5. **`git init` happens in Phase 1** (first commit = scaffold). This Phase 0 leaves the repo un-initialized on purpose.

## 8. Top risks

- **Rate limits** (Twelve Data 8/min, NewsAPI 100/day) are the real constraint — mitigated by long
  stale times, request dedup, and mock fallback. A live terminal feel comes from *client-side*
  simulated ticks between real refreshes, not from hammering the APIs.
- **Scope creep across phase boundaries** (e.g. Phase 3 sprouting a chart) — the hard-stop gates exist
  precisely to catch this.
- **Mock/real consistency** — enforced by shared normalized types; a mock and a real adapter return
  the identical shape, so the UI can't tell them apart except via the provenance tag.
```
