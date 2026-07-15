import { cn } from "@/lib/cn";
import type { Provenance } from "@/data/types";

/**
 * Per-datum provenance indicator. Green LIVE, amber SIM, cyan CACHE. Intended as
 * a development aid — it makes it obvious at a glance which numbers are real. It
 * can be globally hidden by setting NEXT_PUBLIC_HIDE_SOURCE_TAGS=1 before a
 * portfolio/demo build.
 */
const HIDDEN = process.env.NEXT_PUBLIC_HIDE_SOURCE_TAGS === "1";

const STYLES: Record<Provenance, { label: string; cls: string }> = {
  live: { label: "LIVE", cls: "text-up border-up/40" },
  simulated: { label: "SIM", cls: "text-amber border-amber/40" },
  cached: { label: "CACHE", cls: "text-cyan border-cyan/40" },
};

export function SourceTag({
  source,
  provider,
  className,
}: {
  source?: Provenance;
  provider?: string;
  className?: string;
}) {
  if (HIDDEN || !source) return null;
  const style = STYLES[source];
  return (
    <span
      title={provider ? `${provider} · ${source}` : source}
      className={cn(
        "inline-block border px-1 py-px font-mono text-2xs font-semibold leading-none tracking-wide",
        style.cls,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
