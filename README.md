# TERM — a financial intelligence terminal

A dense, keyboard-first market workspace inspired by professional trading
terminals. Cross-asset quotes, charting with indicators, an asset-detail
workspace, a virtual portfolio with real cost-basis maths, a macro dashboard,
and calendars — all behind a ⌘K command palette.

## What's real and what's simulated

Worth reading first, because a terminal that lies about its data is worse than no
terminal.

Every number carries a provenance tag — **LIVE**, **SIM**, or **CACHE** — beside
the panel it came from. Nothing is dressed up as real when it isn't.

| Data | Source | Notes |
| --- | --- | --- |
| Crypto quotes & OHLC | **CoinGecko** | No key needed (demo tier), so crypto is live out of the box. |
| Stock/ETF/index/FX OHLCV | **Twelve Data** | Free key. The primary charting source — Finnhub's candles went premium. |
| Quotes, profiles, company news, earnings | **Finnhub** | Free key. |
| Macro series & the yield curve | **FRED** | Free key. |
| Headlines | **NewsAPI** | Free key; the dev key is localhost-only. |
| Order books, analyst estimates, ownership | **Always simulated** | No viable free source. |
| Economic-release & IPO calendars | **Always simulated** | Nothing free publishes them; the free IPO feeds went premium. |

**With no keys at all the app runs entirely on simulated data**, and every panel
says so. The simulator isn't noise — it holds its invariants (bid below ask, the
52-week range brackets the last price, ownership sums to 100%, each macro series
sits at its real-world level, no IPO prices on a Saturday), because
plausible-looking nonsense is the failure mode that actually costs trust. Those
invariants are pinned by tests in `src/data/adapters/mock.test.ts`.

The portfolio maths is **real regardless of the instruments**: positions are
replayed from a transaction ledger through FIFO lots, and every P&L figure
derives from it.

## Getting started

Requires **Node 20+** (22 recommended) and **pnpm 9**.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Optional — add keys for live data:

```bash
cp .env.example .env.local   # fill in whichever keys you have
```

Every key is optional and independent. A missing or rate-limited source falls
back to the simulator automatically and the tag flips to SIM.

```bash
pnpm build    # production build
pnpm test     # unit tests (maths + simulator invariants)
pnpm lint
```

## Keyboard

Press `?` in the app for the full list — it's rendered from the same registry the
handler reads, so it can't drift out of date.

| Key | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` | Command palette — search symbols, jump to a module, run a command |
| `?` | Keyboard reference |
| `⌘B` | Collapse/expand the module rail |
| `⌘E` | Edit watchlists |
| `[` / `]` | Previous / next module |
| `⌥1…9` | Jump to a module by position |
| `Esc` | Close the palette, a dialog, or the workspace |

In the palette: `↑↓` moves, `⏎` opens a symbol's workspace, `⌘⏎` pins it to the
active watchlist.

## Architecture

Full design and build log in [ARCHITECTURE.md](./ARCHITECTURE.md). The short
version:

```
Component → hook (TanStack Query) → RoutingProvider → adapter → (on failure) → Mock
```

- **No component calls `fetch()` or the mock generator directly.** Everything goes
  through the data hooks, so swapping a source never touches a component.
- **Server state lives in TanStack Query; local truth lives in Zustand.**
  Watchlists, the portfolio ledger and the layout persist to localStorage; palette
  and modal state deliberately don't.
- **API keys never reach the browser** — adapters run server-side behind
  `/api/data/[method]`.

```
src/
  app/          routes + the single data endpoint
  components/
    shell/      command bar, nav, status bar, keyboard map
    primitives/ Panel, Modal, ResizablePanel, DataCell, Skeleton, Sparkline
    charts/     PriceChart (TradingView Lightweight Charts)
    modules/    one screen per module
    workspace/  the asset-detail overlay
    portfolio/  holdings, allocation, exposure, trade entry
    economy/    macro series + yield curve
    search/     the ⌘K palette
  config/       modules, symbol catalog, macro series, shortcuts, chart palette
  data/         provider interface, adapters, hooks, types
  lib/          portfolio maths, formatters, fuzzy matching, indicators
  store/        zustand slices (watchlists, portfolio, layout, ui)
```

## Testing

Two layers, deliberately:

- **`pnpm test`** — unit tests over the pure layers: the portfolio maths and the
  simulator's invariants. Cases are chosen to *discriminate*, not merely to pass:
  FIFO returns 1500 where average cost would say 1000.
- **Browser verification** — every phase was driven end-to-end in headless Chrome.
  That's what caught what types couldn't: a chart that rendered with zero height,
  a container collapsed by its flex parent, a stale query surviving a reopened
  palette.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (`strict` + `noUncheckedIndexedAccess`)
· Tailwind v4 · TanStack Query v5 · Zustand · TradingView Lightweight Charts ·
Recharts · Framer Motion · Faker.

## Accessibility

Dark-only by design, but not at the reader's expense. The text ramp is measured
against WCAG AA (4.5:1) rather than eyeballed, and axe reports no serious or
critical violations on any route or overlay. Charts never encode meaning in
colour alone — every series is legended or direct-labelled, and the categorical
palette is validated for colourblind separation (`src/config/viz.ts`).
Reordering works by keyboard as well as by drag, and `prefers-reduced-motion` is
honoured throughout.

## Licence

A reference project, not investment advice. Market data belongs to the respective
providers under their own terms.
