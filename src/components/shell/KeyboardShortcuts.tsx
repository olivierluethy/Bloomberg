"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEV_MODULES, MODULES, findModuleByHref } from "@/config/modules";
import { SHORTCUTS, type ShortcutId } from "@/config/shortcuts";
import { useLayoutStore } from "@/store/layout";
import { useUIStore } from "@/store/ui";

/**
 * The one place global keys are handled.
 *
 * Every shortcut is matched from the registry rather than an ad-hoc keydown
 * somewhere in a component, so the help screen and the behaviour can't drift
 * apart, and two features can't quietly claim the same key.
 *
 * Renders nothing — it's a behaviour, mounted once by the shell.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  const togglePalette = useUIStore((s) => s.togglePalette);
  const openModal = useUIStore((s) => s.openModal);
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const workspaceSymbol = useUIStore((s) => s.workspaceSymbol);
  const modals = useUIStore((s) => s.modals);
  const toggleNav = useLayoutStore((s) => s.toggleNav);

  const overlayOpen = paletteOpen || Boolean(workspaceSymbol) || modals.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTyping(e.target);

      for (const shortcut of SHORTCUTS) {
        if (!shortcut.match?.(e)) continue;
        if (typing && !shortcut.whileTyping) continue;
        // An overlay owns the keyboard while it's up: ] must page a list behind
        // a dialog exactly never. ⌘K still toggles, so it can close itself.
        if (overlayOpen && shortcut.id !== "palette") continue;

        e.preventDefault();
        run(shortcut.id, e);
        return;
      }
    };

    const run = (id: ShortcutId, e: KeyboardEvent) => {
      switch (id) {
        case "palette":
          togglePalette();
          break;
        case "help":
          openModal("shortcuts");
          break;
        case "watchlists":
          openModal("watchlists");
          break;
        case "toggleNav":
          toggleNav();
          break;
        case "prevModule":
          router.push(step(pathname, -1));
          break;
        case "nextModule":
          router.push(step(pathname, 1));
          break;
        case "jumpModule": {
          const target = navModules()[Number(e.key) - 1];
          if (target) router.push(target.href);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname, togglePalette, openModal, toggleNav, overlayOpen]);

  return null;
}

/** The rail's order — what "next module" and ⌥1…9 count through. */
function navModules() {
  return process.env.NODE_ENV !== "production" ? [...MODULES, ...DEV_MODULES] : MODULES;
}

/** Wraps at both ends, so ] never dead-ends on the last module. */
function step(pathname: string, delta: number): string {
  const mods = navModules();
  const current = findModuleByHref(pathname);
  const i = current ? mods.findIndex((m) => m.id === current.id) : -1;
  const next = mods[(((i < 0 ? 0 : i) + delta) % mods.length + mods.length) % mods.length];
  return next?.href ?? "/";
}

/**
 * True when the key belongs to whatever the user is typing into. Without this,
 * "[" in a watchlist name would navigate away mid-edit.
 */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}
