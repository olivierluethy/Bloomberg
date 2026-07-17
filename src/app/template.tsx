"use client";

import { motion, useReducedMotion } from "framer-motion";
import { routeVariants } from "@/lib/motion";

/**
 * A `template` re-mounts on every navigation (unlike `layout`), which gives us
 * a clean hook for the tab-switch transition without any pathname bookkeeping.
 *
 * Reduced motion is honoured explicitly. The rule in globals.css only
 * neutralises CSS animations and transitions — Framer drives transforms from
 * JS and sails straight past that media query. Now that ] and [ page through
 * modules a keystroke at a time, this is the transition a motion-sensitive user
 * would meet most often.
 */
export default function ModuleTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <div className="h-full">{children}</div>;

  return (
    <motion.div variants={routeVariants} initial="hidden" animate="visible" className="h-full">
      {children}
    </motion.div>
  );
}
