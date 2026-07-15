import { cn } from "@/lib/cn";

/**
 * Loading placeholders. We always render skeletons during fetches — never a
 * blank panel — so the terminal never looks broken while data is in flight.
 */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("shimmer relative overflow-hidden bg-elevated", className)}
      style={style}
      aria-hidden
    />
  );
}

/** A stack of shrinking text lines, for prose/detail blocks. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          // last line is shorter, like a real paragraph
          {...(i === lines - 1 ? { style: { width: "62%" } } : {})}
        />
      ))}
    </div>
  );
}

/** Rows sized like a data table, for list panels loading their contents. */
export function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 flex-1" style={{ maxWidth: "40%" }} />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
