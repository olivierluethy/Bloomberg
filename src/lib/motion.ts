import type { Variants, Transition } from "framer-motion";

/**
 * Shared Framer Motion vocabulary. Every phase pulls transitions from here so
 * the whole app moves with one hand — nothing re-derives its own easing.
 */

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

/** Panels mount/unmount with a short rise-and-fade. */
export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: EASE_OUT } },
};

/** Route / tab switches: a flat, quick cross-fade with a hair of horizontal drift. */
export const routeVariants: Variants = {
  hidden: { opacity: 0, x: 6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

/** Container that staggers its children — used for the boot-in sequence. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
