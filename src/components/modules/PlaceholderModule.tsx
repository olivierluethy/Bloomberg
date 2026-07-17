"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Panel } from "@/components/primitives/Panel";
import { SkeletonRows, SkeletonText } from "@/components/primitives/Skeleton";
import { MODULES } from "@/config/modules";
import { panelVariants, staggerContainer } from "@/lib/motion";

/**
 * Stand-in screen for modules that are wired into the shell but not yet built.
 * It renders real panel chrome with skeleton content so the shell can be
 * verified end-to-end before any data work. Each panel boots in on a stagger.
 */
export function PlaceholderModule({ moduleId }: { moduleId: string }) {
  const reduce = useReducedMotion();
  const mod = MODULES.find((m) => m.id === moduleId);

  return (
    <div className="flex h-full flex-col overflow-auto p-1">
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xs font-bold tracking-wide text-amber">
          {mod?.code ?? "—"}
        </span>
        <h1 className="text-xs font-bold uppercase text-amber2">{mod?.label ?? "Module"}</h1>
        <span className="text-2xs text-fg-dim">{mod?.blurb}</span>
        <span className="ml-auto eyebrow">Awaiting data layer · Phase 2</span>
      </div>

      <motion.div
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "visible"}
        className="grid flex-1 grid-cols-1 gap-px lg:grid-cols-3"
      >
        <motion.div variants={reduce ? undefined : panelVariants} className="lg:col-span-2">
          <Panel tag="1" title="Overview" eyebrow="Screen" className="h-full min-h-64" scroll>
            <SkeletonRows rows={8} />
          </Panel>
        </motion.div>

        <motion.div variants={reduce ? undefined : panelVariants} className="flex flex-col gap-px">
          <Panel tag="2" title="Detail" eyebrow="Summary" className="min-h-40">
            <div className="p-1">
              <SkeletonText lines={5} />
            </div>
          </Panel>
          <Panel tag="3" title="Activity" eyebrow="Feed" className="min-h-40" scroll>
            <SkeletonRows rows={4} />
          </Panel>
        </motion.div>
      </motion.div>
    </div>
  );
}
