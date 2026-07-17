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
 *
 * Amber on black, with the active item inverted to black-on-amber. The inversion
 * is the whole active affordance: there is no left accent border, no raised
 * surface, no weight change — the reference marks the current item by flipping
 * the two colours and nothing else.
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
        collapsed ? "w-12" : "w-44",
      )}
      aria-label="Modules"
    >
      <div className="flex-1 overflow-y-auto p-1">
        {MODULE_GROUPS.map((group) => (
          <div key={group} className="mb-1">
            {/* Group labels are the reference's blue MENU bar, one per section. */}
            {!collapsed && <div className="eyebrow bg-blue px-1 py-0.5">{group}</div>}
            <ul className="flex flex-col">
              {modulesByGroup(group).map((mod) => (
                <NavItem key={mod.id} mod={mod} active={active?.id === mod.id} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}

        {showDev && (
          <div className="mb-1">
            {!collapsed && <div className="eyebrow bg-blue px-1 py-0.5">Dev</div>}
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
        className="flex h-5 items-center justify-center border-t border-line text-amber transition-colors hover:bg-amber hover:text-black"
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        aria-keyshortcuts="Meta+B Control+B"
      >
        <span className="text-xs" aria-hidden>{collapsed ? "»" : "«"}</span>
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
          "flex items-center gap-1.5 px-1 py-0.5 text-xs transition-colors",
          active ? "bg-amber text-black" : "text-amber hover:bg-amber hover:text-black",
        )}
      >
        <span className="flex w-7 shrink-0 justify-start font-bold">{mod.code}</span>
        {!collapsed && <span className="truncate uppercase">{mod.label}</span>}
      </Link>
    </li>
  );
}
