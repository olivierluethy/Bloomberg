# Bloomberg Terminal Reskin — Work Log

> **Scope:** a visual/CSS transformation of an already-functional app. No data,
> state-management, or component-behaviour changes. Commit `c2b8182`,
> 41 files, +857 / −514.
>
> See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design record this feeds into,
> and [README.md](./README.md) for how to run it.

## Why

The build was functionally complete — live/sim provenance badges, pinned
watchlist, top gainers/losers, command palette, real interactivity — but it read
as a modern SaaS fintech product rather than a trading terminal: near-black
ground, amber used only as an accent, rounded cards, generous padding, a
proportional UI face, soft elevation.

The target was the real terminal's visual grammar, taken from a reference mockup
supplied as design DNA (not as functionality): colour usage, density, typography,
panel chrome, and the bottom function-key bar.

## The approach that made this cheap

**The token names in `globals.css` were kept; only their values changed.**

Every component already pulled from `@theme` (`text-fg`, `bg-panel`,
`border-line`, `text-amber`…), so the palette and density shift landed as a value
remap in one file plus targeted chrome work — not a hex-by-hex edit across 40
components. This is why the diff is legible, and it's the second time the Tailwind
v4 `@theme` decision has paid for itself (the first was the Phase 11 contrast fix).

Two tokens were added (`--color-amber2`, `--color-blue`), two for the function
keys (`--color-key-yellow`, `--color-key-red`), and the text ramp collapsed from
three steps to the reference's two.

## Audit — violations found before writing code

| Rule | Violations found |
|---|---|
| 1 · true black | `--color-void: #0a0a0b`, `--color-panel: #111214`, `--color-elevated: #17181b` — all near-black |
| 2 · amber default | Amber was accent-only; body defaulted to `--color-fg: #e6e7e9`. No `amber2`/`blue` tokens existed |
| 3 · zero radius | `rounded-full` in `StatusBar:47`, `CalendarsModule:294`; no global reset |
| 4 · panel headers | `Panel.tsx` had an eyebrow+title on a hairline border. No blue bar, no numbering |
| 5 · density | Base 13px, IBM Plex **Sans** body, line-height 1.25rem, cells `px-3 py-1.5` (12px/6px) |
| 6 · hairlines | `shadow-lg` ×4 (chart tooltips), `shadow-2xl` + `backdrop-blur-[2px]` (`Modal`) |
| 7 · semantics | `up: #26d07c`, `down: #ff4d5e` — wrong greens/reds |
| 8 · ticker tape | `MarketsOverview.SummaryChip` was literal card tiles; `StatusBar` had a static index strip |
| 9 · command line | `CommandTrigger` was a bordered search button with a `▌` glyph caret |
| 10 · function keys | Did not exist |
| 2 · centralisation | `ChartCanvas.tsx:34-44` hardcoded 11 hexes — the exact drift `ARCHITECTURE.md` warns about |

## What changed, rule by rule

1. **True black.** `--color-void` and `--color-panel` are both `#000000`. The
   reference has one ground and no elevation model. `--color-elevated` survives
   only as a near-invisible hover/skeleton tint (`#101010`) — any visible
   elevation is what reads as "modern SaaS".
2. **Amber is the default ink.** `body { color: var(--color-amber) }`. White,
   grey, green and red are now *overrides*, not the baseline. `amber2` (`#ffb700`)
   is reserved for panel-header text, table headers and highlighted values.
3. **Zero border-radius**, enforced by one global reset:
   ```css
   *, *::before, *::after { border-radius: 0 !important; }
   ```
   Done globally rather than by deleting `rounded-*` utilities one at a time,
   because the rule is absolute and a global reset can't be regressed by a future
   component reaching for a rounded utility out of habit. It intentionally squares
   off the two status dots — the reference has no pills or circles.
4. **Panel headers** are solid blue (`#0068ff`) bars with bold amber2 text,
   prefixed with a panel number or module mnemonic — `1) TOP GAINERS`,
   `MKT) MARKETS`, `7) TREASURY YIELD CURVE`. The prefix is a caller-supplied
   `tag` prop, **not** auto-counted: panels mount conditionally on load state, and
   a self-counting scheme would renumber them as data lands — exactly what the
   convention exists to prevent.
5. **Density.** One monospace stack (Roboto Mono → IBM Plex Mono → Consolas →
   Courier New), 11–12px, line-height 1.2, 2–4px cells. `--font-sans` is an
   *alias* of the mono stack rather than a second face, so no component can
   accidentally reintroduce a proportional font. Panel grids use hairline gutters
   (`gap-px`) instead of 12px spacing.
6. **Hairlines only.** All `shadow-lg` / `shadow-2xl` / `backdrop-blur` removed;
   one divider weight (`#2a2a2a`), no bright/dim pair to layer with.
7. **Semantic colours** set to `#00c805` / `#ff433d` / `#ffffff` / `#7a7a7a`.
8. **Ticker tape** (`TickerTape.tsx`) — one scrolling line, `symbol | price | %chg`,
   amber / white / green-or-red. It reads the same `MARKETS_SUMMARY` universe
   through the same `useQuotes` hook the card tiles used, so it's a
   re-presentation of existing data, not a new feed. The strip is rendered twice
   and translated `-50%` so the loop has no visible seam; it pauses on hover so a
   value can actually be read.
9. **Command line** (`CommandLine.tsx`) — amber `>` prompt, blinking solid block
   cursor (`steps(1)`, which is load-bearing: an eased blink reads as a modern
   text caret), green `<GO>`. Deliberately **not** a real `<input>` — typing
   happens in the palette overlay, and a focusable field here would take the caret
   and swallow the first keystroke before the palette mounts.
10. **Function-key bar** (`FunctionKeys.tsx`) — solid yellow/red/green blocks with
    bold black text. Every key maps to something the app already did: EQUITY /
    CORP / PORT route, GO opens the palette, CANCEL mirrors Escape's precedence
    exactly (palette → modal stack → workspace) so the two can't disagree about
    what "close" means. Nothing new was invented.
11. **Left nav** restyled to amber-on-black with the active item inverted to
    black-on-amber. The inversion *is* the entire active affordance — no accent
    border, no raised surface, no weight change. Group labels became blue bars.
    The existing MKT/N/EQ/ETF/IDX/CMD/GOVT/FX/CRY/ECO/PORT/CAL structure is
    untouched, as required.
12. **SIM/LIVE badges** kept (genuinely useful, no reference equivalent) but
    restyled to the terminal's badge chrome: solid fill, black text, square,
    dense. Solid rather than outlined because at 10px an outlined badge is mostly
    border.

### Charts

`ChartCanvas` now **reads** the design tokens at mount via `getComputedStyle`
rather than copying them as hex literals. lightweight-charts paints to a canvas
and can't resolve `var()` the way an SVG chart can — so the indirection is the
point, and it closes the drift `ARCHITECTURE.md` already documented (the axes had
kept an old grey after the text ramp was raised, leaving labels at 2.5:1 while the
rest of the app was fixed).

Applied: amber chart ink, amber axis labels, hairline grid, and the dashed
last-price marker running to the axis. Candles keep semantic green/red. A `tint()`
helper derives the volume/MACD histogram fills from the tokens instead of frozen
`rgba()` literals.

`SERIES_INK` was added for single-series line/area charts (macro series, yield
curve) — amber, because a line carrying one series has no identity to encode. It's
kept distinct from `MAGNITUDE_HUE` (which fills *bars* whose length already
carries the value) so retinting lines can't silently retint bars.

## Deviations — and why

- **`ASSET_CLASS_COLORS` in `viz.ts` is untouched.** Rule 2 says chart colours
  default to amber, but this is a validated colourblind-safe categorical palette
  for the allocation/exposure charts. Flattening it to amber would make adjacent
  stacked segments indistinguishable — destroying what the chart encodes. The
  reference has no equivalent chart, so the rule doesn't reach it.
- **The command line shows the app's own hint text**, not the reference's
  `AAPL US EQUITY` placeholder, and in grey rather than amber — amber there reads
  as text you already typed. Prompt, cursor and `<GO>` are exactly per rule 9.
- **`MarketsOverview`'s summary strip was removed rather than converted.** Rule 8
  says replace the card-tile strip with a tape; the shell tape now shows that
  exact universe from the same hook, so keeping the tiles would have rendered the
  same seven instruments twice on one page.
- **`StatusBar`'s benchmark index chips were removed.** They were static Phase 1
  placeholder numbers; the tape carries the same instruments from real quotes.

## Deliberate accessibility regression

Amber2 (`#ffb700`) on blue (`#0068ff`) measures **2.71:1**, under the WCAG AA
4.5:1 floor the text ramp was specifically rebuilt to clear. This reverses part of
the Phase 11 contrast work.

**This was raised before any code was written and chosen explicitly:** authenticity
over the audit, because the real terminal looks exactly like this.

It is the *only* violation. An axe `wcag2aa` pass over `/`, `/stocks`,
`/portfolio`, `/economy` and `/news` reports `color-contrast` and nothing else,
and every node is this one pair. Two failures that were **not** deliberate were
found by that pass and fixed:

- grey `#7a7a7a` on the blue bar (the watchlist EDIT button)
- blue `#0068ff` **text** on black at 4.42:1 (news tickers) — blue is a bar fill
  in this design, never ink. `/news` went 32 → 6 violations.

Everything else clears AA on black: amber 8.8:1, amber2 12.0:1, white 21:1,
grey 4.8:1, green 9.6:1, red 5.3:1. If the trade is revisited, darkening
`--color-blue` is the cheapest fix that keeps the amber-on-blue signature.

## Bugs found by looking at the app

`tsc`, `eslint`, 52 unit tests and the production build were **all green while the
app was visibly broken.** Each of these was caught by screenshotting the running
app, not by the toolchain:

1. **Panels pushed off-screen.** The shell `grid` had no explicit column, so its
   implicit `auto` column sized to max-content — and the ticker's duplicated strip
   is ~2200px wide intrinsically. `main` measured **2183px in a 1600px viewport**
   and Top Losers ran off the edge. Fix: `grid-cols-1`, i.e. `minmax(0, 1fr)`.
2. **CANCEL was unclickable in the only state it enables in.** It enables only
   when an overlay is open — and that overlay's full-screen backdrop then swallows
   the click. Fix: `z-[60]` puts the bar above the backdrop, like the real thing.
3. **Palette match highlighting went invisible.** Matched characters rendered
   amber2 on the inverted amber active row — the exact letters you just typed
   became the only ones you couldn't see. Fix: on an active row the match is
   carried by the underline against inherited black.
4. `BTC-USD` wrapped to two lines (a hyphen is a legal break point at this
   density), desyncing row heights.
5. Payrolls and the yield curve were both numbered `4)` — the series panels number
   dynamically, the curve was hardcoded. Now derived from `ECON_SERIES.length`.
6. **Self-inflicted token drift.** Splitting `AXIS_INK` into "axis line" vs
   "label" ink made every Recharts tick label the hairline grey. Despite the name,
   `AXIS_INK` has *never* coloured an axis line — every call site uses it as a tick
   label `fill` and reaches for `GRID_INK` for the rule itself. One rename
   reproduced the exact failure its own comment block warns about.

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint src` | clean |
| `pnpm test` (vitest) | 52/52 passing |
| `pnpm build` | 17 routes compiled |
| Browser pass | **29/29** |
| axe `wcag2aa` × 5 routes | only the deliberate amber-on-blue |

The browser pass drives real Chrome and checks both rule compliance *measured from
the rendered page* (computed background, computed ink, rounded-node count,
shadow-node count, header bar colour, tape animation, cursor timing function, key
colours, active-nav inversion, horizontal overflow) **and** the interactivity that
had to survive: column sorting reorders rows, watchlist pin/unpin mutates the
persisted list, ⌘K opens and filters the palette, matched chars stay legible,
CANCEL/GO/EQUITY keys work, nav routes.

Per this repo's hard-won rule about vacuous assertions, the strictest checks were
**confirmed falsifiable** by mutating the live page and watching them break:

```
baseline rounded nodes : 0     after injecting radius : 12 → check CAN fail ✓
baseline shadow nodes  : 0     after injecting shadow : 3  → check CAN fail ✓
body background        : #000  after forcing #0a0a0b       → check CAN fail ✓
```

CANCEL proved itself the hard way — it timed out before the `z-[60]` fix.

> Note: the browser suites live in the session scratchpad, not the repo. As
> `ARCHITECTURE.md` already notes, they're worth committing under `e2e/` one day.

## New files

- `src/components/shell/TickerTape.tsx`
- `src/components/shell/CommandLine.tsx`
- `src/components/shell/FunctionKeys.tsx`
