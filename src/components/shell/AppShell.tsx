"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CommandBar } from "@/components/shell/CommandBar";
import { LeftNav } from "@/components/shell/LeftNav";
import { StatusBar } from "@/components/shell/StatusBar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";
import { ShortcutsHelp } from "@/components/shell/ShortcutsHelp";
import { WatchlistManager } from "@/components/watchlists/WatchlistManager";
import { AssetWorkspace } from "@/components/workspace/AssetWorkspace";
import { EASE_OUT } from "@/lib/motion";

/**
 * The application frame: command bar on top, nav + main panel area in the
 * middle, status bar at the bottom. On first load the chrome boots in with a
 * short staggered rise; reduced-motion users get it instantly.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  const boot = (order: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: order === 0 ? -8 : order === 2 ? 8 : 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: 0.05 * order, ease: EASE_OUT },
        };

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] overflow-hidden">
      <motion.div {...boot(0)}>
        <CommandBar />
      </motion.div>

      <div className="flex min-h-0 overflow-hidden">
        <motion.div {...boot(1)} className="flex min-h-0">
          <LeftNav />
        </motion.div>
        <motion.main
          {...boot(1)}
          className="min-w-0 flex-1 overflow-hidden"
          // The scroll/padding context every module renders into.
        >
          {children}
        </motion.main>
      </div>

      <motion.div {...boot(2)}>
        <StatusBar />
      </motion.div>

      {/* Overlays live at the shell level: ⌘K works from any module, and the
          workspace and watchlist editor open over whatever module you're in. */}
      <KeyboardShortcuts />
      <CommandPalette />
      <WatchlistManager />
      <AssetWorkspace />
      <ShortcutsHelp />
    </div>
  );
}
