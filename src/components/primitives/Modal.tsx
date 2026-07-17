"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { EASE_OUT } from "@/lib/motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Overlay shell shared by the command palette and the watchlist editor.
 * Owns the parts that are easy to get subtly wrong: Escape to close, a Tab focus
 * trap, focus restoration to whatever was focused before, and locking the body
 * behind the overlay.
 *
 * The caller supplies the content and its own labelling — `Modal` only provides
 * chrome and behavior.
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  label,
  className,
  align = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Id of the element titling this dialog. Prefer this over `label`. */
  labelledBy?: string;
  /** Fallback accessible name when there's no visible title. */
  label?: string;
  className?: string;
  /** The palette sits high; ordinary dialogs center. */
  align?: "center" | "top";
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Remember the trigger so focus can go home on close.
  useEffect(() => {
    if (open) restoreRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    // Focus the first control (the palette input, a name field) or the panel.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;

      // Wrap at the ends so focus can never escape the dialog.
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex justify-center bg-void/80 p-4",
            align === "top" ? "items-start pt-[12vh]" : "items-center",
          )}
          initial={reduce ? undefined : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.12, ease: EASE_OUT }}
          onMouseDown={(e) => {
            // Only a press that starts on the backdrop dismisses — a drag that
            // ends there (text selection inside the dialog) must not.
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            initial={reduce ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className={cn(
              "flex max-h-full min-h-0 w-full flex-col border border-line bg-panel outline-none",
              className,
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
