"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { MODULE_GROUPS, findModuleByHref, modulesByGroup } from "@/config/modules";

/**
 * Module navigation rail. Items are Bloomberg-style function mnemonics (EQ, FX,
 * GOVT…) so the rail stays legible when collapsed to codes only. Active state is
 * derived from the route, never stored — one source of truth.
 */
export function LeftNav() {
  const pathname = usePathname();
  const active = findModuleByHref(pathname);
  const [collapsed, setCollapsed] = useState(false);

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
              {modulesByGroup(group).map((mod) => {
                const isActive = active?.id === mod.id;
                return (
                  <li key={mod.id}>
                    <Link
                      href={mod.href}
                      title={collapsed ? `${mod.label} — ${mod.blurb}` : mod.blurb}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 border-l-2 px-2 py-1.5 transition-colors",
                        isActive
                          ? "border-amber bg-elevated text-fg"
                          : "border-transparent text-fg-dim hover:bg-elevated hover:text-fg",
                      )}
                    >
                      <span
                        className={cn(
                          "flex w-9 shrink-0 justify-center font-mono text-2xs font-bold tracking-wide",
                          isActive ? "text-amber" : "text-fg-faint group-hover:text-fg-dim",
                        )}
                      >
                        {mod.code}
                      </span>
                      {!collapsed && <span className="truncate text-sm">{mod.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-8 items-center justify-center border-t border-line text-fg-faint transition-colors hover:bg-elevated hover:text-fg-dim"
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        <span className="font-mono text-sm" aria-hidden>{collapsed ? "»" : "«"}</span>
      </button>
    </nav>
  );
}
