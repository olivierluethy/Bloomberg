/**
 * Builds and ranks command-palette entries.
 *
 * Kept free of React so the ranking is pure and inspectable: the component
 * supplies a context of callbacks, this module decides what exists and in what
 * order it lands.
 */

import { MODULES, DEV_MODULES, type ModuleDef } from "@/config/modules";
import { SYMBOL_CATALOG, type SymbolEntry } from "@/config/symbols";
import { fuzzyMatchFields } from "@/lib/fuzzy";
import type { Watchlist } from "@/store/watchlists";

export type PaletteGroup = "Symbols" | "Modules" | "Watchlists" | "Actions";

export interface PaletteItem {
  id: string;
  group: PaletteGroup;
  /** Primary text — a ticker, a module name, a command. */
  title: string;
  subtitle?: string;
  /** Short right-aligned tag: a module mnemonic, a symbol count. */
  tag?: string;
  /** Extra text that should match a query but isn't displayed. */
  keywords?: string;
  /** True for symbols already in the active watchlist. */
  pinned?: boolean;
  run: () => void;
  /** Secondary action, run with Cmd/Ctrl+Enter. */
  runAlt?: () => void;
}

export interface PaletteContext {
  lists: Watchlist[];
  activeList?: Watchlist;
  isDev: boolean;
  navigate: (href: string) => void;
  togglePin: (symbol: string) => void;
  setActiveList: (id: string) => void;
  openManager: () => void;
  createList: () => void;
}

/** Ranked above/below other groups when the query is empty. */
const GROUP_ORDER: Record<PaletteGroup, number> = {
  Symbols: 0,
  Modules: 1,
  Watchlists: 2,
  Actions: 3,
};

export function buildItems(ctx: PaletteContext): PaletteItem[] {
  return [
    ...symbolItems(ctx),
    ...moduleItems(ctx),
    ...watchlistItems(ctx),
    ...actionItems(ctx),
  ];
}

function symbolItems(ctx: PaletteContext): PaletteItem[] {
  const pinnedSet = new Set(ctx.activeList?.symbols ?? []);

  return SYMBOL_CATALOG.map((entry: SymbolEntry) => ({
    id: `symbol:${entry.symbol}`,
    group: "Symbols" as const,
    title: entry.symbol,
    subtitle: entry.name,
    tag: moduleCode(entry.moduleId),
    keywords: entry.assetClass,
    pinned: pinnedSet.has(entry.symbol),
    // Phase 6 has no asset-detail view yet, so the primary action is the one
    // this phase actually delivers: pin/unpin. Phase 7 repoints it at the
    // workspace overlay and demotes pinning to the alternate action.
    run: () => ctx.togglePin(entry.symbol),
    runAlt: () => ctx.navigate(moduleHref(entry.moduleId)),
  }));
}

function moduleItems(ctx: PaletteContext): PaletteItem[] {
  const mods = ctx.isDev ? [...MODULES, ...DEV_MODULES] : MODULES;
  return mods.map((mod: ModuleDef) => ({
    id: `module:${mod.id}`,
    group: "Modules" as const,
    title: mod.label,
    subtitle: mod.blurb,
    tag: mod.code,
    keywords: `${mod.code} ${mod.group}`,
    run: () => ctx.navigate(mod.href),
  }));
}

function watchlistItems(ctx: PaletteContext): PaletteItem[] {
  return ctx.lists.map((list) => ({
    id: `watchlist:${list.id}`,
    group: "Watchlists" as const,
    title: list.name,
    subtitle: list.id === ctx.activeList?.id ? "Active watchlist" : "Switch to this watchlist",
    tag: `${list.symbols.length}`,
    keywords: "watchlist list",
    run: () => ctx.setActiveList(list.id),
  }));
}

function actionItems(ctx: PaletteContext): PaletteItem[] {
  return [
    {
      id: "action:new-watchlist",
      group: "Actions",
      title: "Create watchlist…",
      subtitle: "Start a new empty list",
      keywords: "new add watchlist create",
      run: ctx.createList,
    },
    {
      id: "action:manage-watchlists",
      group: "Actions",
      title: "Manage watchlists…",
      subtitle: "Rename, reorder, or delete lists",
      keywords: "edit rename delete reorder watchlist manage",
      run: ctx.openManager,
    },
  ];
}

export interface RankedItem {
  item: PaletteItem;
  /** Indices to highlight in `title`, empty when the name/keywords matched. */
  indices: number[];
}

/**
 * Filters and ranks against a query. An empty query returns a compact default
 * view — pinned symbols first, then modules — rather than the whole catalog.
 */
export function filterItems(items: PaletteItem[], query: string, limit = 40): RankedItem[] {
  const q = query.trim();

  if (!q) {
    const defaults = items.filter(
      (i) => (i.group === "Symbols" && i.pinned) || i.group === "Modules" || i.group === "Actions",
    );
    return defaults
      .sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group])
      .slice(0, limit)
      .map((item) => ({ item, indices: [] }));
  }

  const scored = items.flatMap((item) => {
    const match = fuzzyMatchFields(
      { title: item.title, subtitle: item.subtitle ?? "", keywords: item.keywords ?? "" },
      q,
      // A ticker hit should always beat a description hit.
      { title: 1, subtitle: 0.55, keywords: 0.4 },
    );
    if (!match) return [];
    // Nudge symbols up: typing into a market terminal usually means a ticker.
    const bias = item.group === "Symbols" ? 40 : 0;
    return [{ item, score: match.score + bias, indices: match.field === "title" ? match.indices : [] }];
  });

  return scored
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map(({ item, indices }) => ({ item, indices }));
}

/** Groups ranked items for rendering while preserving rank order within a group. */
export function groupRanked(ranked: RankedItem[]): { group: PaletteGroup; items: RankedItem[] }[] {
  const groups: { group: PaletteGroup; items: RankedItem[] }[] = [];
  for (const entry of ranked) {
    const existing = groups.find((g) => g.group === entry.item.group);
    if (existing) existing.items.push(entry);
    else groups.push({ group: entry.item.group, items: [entry] });
  }
  return groups;
}

function moduleHref(moduleId: string): string {
  return MODULES.find((m) => m.id === moduleId)?.href ?? "/";
}

function moduleCode(moduleId: string): string {
  return MODULES.find((m) => m.id === moduleId)?.code ?? "";
}
