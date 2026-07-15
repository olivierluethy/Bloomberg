import { cn } from "@/lib/cn";

/**
 * Tiny dependency-free SVG trend line. Deliberately NOT the full charting engine
 * (that's Phase 4's <PriceChart/>) — just a compact glyph for list rows. Color
 * is inherited from `text-*` so callers set direction with a class.
 */
export function Sparkline({
  data,
  width = 72,
  height = 22,
  className,
  strokeWidth = 1.25,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
}) {
  if (data.length < 2) return <div style={{ width, height }} aria-hidden />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;
  const usableH = height - pad * 2;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = pad + (usableH - ((v - min) / range) * usableH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
