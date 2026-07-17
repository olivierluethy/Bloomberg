import { cn } from "@/lib/cn";
import type { Provenance } from "@/data/types";

/**
 * Per-datum provenance indicator. Green LIVE, amber SIM, blue CACHE. Intended as
 * a development aid — it makes it obvious at a glance which numbers are real. It
 * can be globally hidden by setting NEXT_PUBLIC_HIDE_SOURCE_TAGS=1 before a
 * portfolio/demo build.
 *
 * The reference mockup has no equivalent, so the chrome is derived from its key
 * blocks instead: a solid fill with black text, square, and as small as the type
 * scale goes. Solid rather than outlined because at 10px an outlined badge is
 * mostly border, and the fill is what makes LIVE vs SIM readable at a glance
 * without spending a colour the data itself needs.
 */
const HIDDEN = process.env.NEXT_PUBLIC_HIDE_SOURCE_TAGS === "1";

const STYLES: Record<Provenance, { label: string; cls: string }> = {
  live: { label: "LIVE", cls: "bg-up text-black" },
  simulated: { label: "SIM", cls: "bg-amber text-black" },
  cached: { label: "CACHE", cls: "bg-blue text-black" },
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
        "inline-block px-1 text-2xs font-bold leading-tight",
        style.cls,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
