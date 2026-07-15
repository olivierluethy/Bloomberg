/**
 * The single source of truth for navigable modules. Left nav, routing, and
 * (later) the command palette all read from this list, so adding a module is
 * one entry here — not four edits scattered across the app.
 *
 * `code` is a short Bloomberg-style function mnemonic used as the nav glyph.
 */

export type ModuleGroup = "Overview" | "Asset Classes" | "Analysis";

export interface ModuleDef {
  id: string;
  label: string;
  href: string;
  /** Short mnemonic shown in the nav rail, e.g. "EQ", "FX". */
  code: string;
  group: ModuleGroup;
  /** One-line description surfaced in tooltips / placeholder screens. */
  blurb: string;
}

export const MODULES: ModuleDef[] = [
  { id: "markets", label: "Markets", href: "/", code: "MKT", group: "Overview", blurb: "Cross-asset market overview" },
  { id: "news", label: "News", href: "/news", code: "N", group: "Overview", blurb: "Live financial headlines" },

  { id: "stocks", label: "Stocks", href: "/stocks", code: "EQ", group: "Asset Classes", blurb: "Equities quotes and screens" },
  { id: "etfs", label: "ETFs", href: "/etfs", code: "ETF", group: "Asset Classes", blurb: "Exchange-traded funds" },
  { id: "indices", label: "Indices", href: "/indices", code: "IDX", group: "Asset Classes", blurb: "Benchmark indices" },
  { id: "commodities", label: "Commodities", href: "/commodities", code: "CMD", group: "Asset Classes", blurb: "Energy, metals, agriculture" },
  { id: "bonds", label: "Bonds", href: "/bonds", code: "GOVT", group: "Asset Classes", blurb: "Rates and fixed income" },
  { id: "forex", label: "Forex", href: "/forex", code: "FX", group: "Asset Classes", blurb: "Currency pairs" },
  { id: "crypto", label: "Crypto", href: "/crypto", code: "CRY", group: "Asset Classes", blurb: "Digital assets" },

  { id: "economy", label: "Economy", href: "/economy", code: "ECO", group: "Analysis", blurb: "Macro indicators and yields" },
  { id: "portfolio", label: "Portfolio", href: "/portfolio", code: "PORT", group: "Analysis", blurb: "Virtual holdings and P&L" },
  { id: "calendars", label: "Calendars", href: "/calendars", code: "CAL", group: "Analysis", blurb: "Earnings, economic, IPO" },
];

export const MODULE_GROUPS: ModuleGroup[] = ["Overview", "Asset Classes", "Analysis"];

export function modulesByGroup(group: ModuleGroup): ModuleDef[] {
  return MODULES.filter((m) => m.group === group);
}

export function findModuleByHref(pathname: string): ModuleDef | undefined {
  // Exact match for "/", longest-prefix match for nested module routes.
  if (pathname === "/") return MODULES.find((m) => m.href === "/");
  return MODULES.filter((m) => m.href !== "/" && pathname.startsWith(m.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}
