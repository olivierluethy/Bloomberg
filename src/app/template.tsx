"use client";

import { motion } from "framer-motion";
import { routeVariants } from "@/lib/motion";

/**
 * A `template` re-mounts on every navigation (unlike `layout`), which gives us
 * a clean hook for the tab-switch transition without any pathname bookkeeping.
 */
export default function ModuleTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={routeVariants}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
