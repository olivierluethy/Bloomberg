"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useLayoutHydration, useLayoutStore } from "@/store/layout";
import {
  DEV_MODULES,
  MODULE_GROUPS,
  type ModuleDef,
  findModuleByHref,
  modulesByGroup,
} from "@/config/modules";

/**
 * Module navigation rail. Items are Bloomberg-style function mnemonics (EQ, FX,
 * GOVT…) so the rail stays legible when collapsed to codes only. Active state is
 * derived from the route, never stored — one source of truth.
 */
export function LeftNav() {
  const pathname = usePathname();
  const active = findModuleByHref(pathname);
  // Collapsed state is layout, so it lives in the persisted layout store rather
  // than local state — and ⌘B drives the same switch as the footer button.
  const hydrated = useLayoutHydration();
  const stored = useLayoutStore((s) => s.navCollapsed);
  const toggleNav = useLayoutStore((s) => s.toggleNav);
  const collapsed = hydrated && stored;
  const showDev = process.env.NODE_ENV !== "production" && DEV_MODULES.length > 0;

  return (
    <nav
      className={cn(
        "flex shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200",
        collapsed ? "w-14" : "w-48",
      )}
      aria-label="Modules"
    >
      <div className="flex-1 overflow-y-auto py-2">
        {MODULE_GROUPS.map((group) => (
          <div key={group} className="mb-1 px-2">
            {!collapsed && <div className="eyebrow px-2 py-1.5">{group}</div>}
            <ul className="flex flex-col">
              {modulesByGroup(group).map((mod) => (
                <NavItem key={mod.id} mod={mod} active={active?.id === mod.id} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}

        {showDev && (
          <div className="mb-1 px-2">
            {!collapsed && <div className="eyebrow px-2 py-1.5 text-amber/70">Dev</div>}
            <ul className="flex flex-col">
              {DEV_MODULES.map((mod) => (
                <NavItem key={mod.id} mod={mod} active={active?.id === mod.id} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggleNav}
        className="flex h-8 items-center justify-center border-t border-line text-fg-faint transition-colors hover:bg-elevated hover:text-fg-dim"
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        aria-keyshortcuts="Meta+B Control+B"
      >
        <span className="font-mono text-sm" aria-hidden>{collapsed ? "»" : "«"}</span>
      </button>
    </nav>
  );
}

function NavItem({ mod, active, collapsed }: { mod: ModuleDef; active: boolean; collapsed: boolean }) {
  return (
    <li>
      <Link
        href={mod.href}
        title={collapsed ? `${mod.label} — ${mod.blurb}` : mod.blurb}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 border-l-2 px-2 py-1.5 transition-colors",
          active
            ? "border-amber bg-elevated text-fg"
            : "border-transparent text-fg-dim hover:bg-elevated hover:text-fg",
        )}
      >
        <span
          className={cn(
            "flex w-9 shrink-0 justify-center font-mono text-2xs font-bold tracking-wide",
            active ? "text-amber" : "text-fg-faint group-hover:text-fg-dim",
          )}
        >
          {mod.code}
        </span>
        {!collapsed && <span className="truncate text-sm">{mod.label}</span>}
      </Link>
    </li>
  );
}
