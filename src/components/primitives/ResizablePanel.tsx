"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The single resizable-panel primitive for the whole app. Later phases compose
 * this rather than re-implementing pointer math per module.
 *
 * It resizes itself along one axis via an edge handle. The handle is a real
 * `separator` with arrow-key support, so resizing works without a mouse.
 */
export function ResizablePanel({
  axis = "x",
  defaultSize,
  min = 160,
  max = 720,
  handleSide = "end",
  step = 16,
  className,
  children,
}: {
  axis?: "x" | "y";
  defaultSize: number;
  min?: number;
  max?: number;
  /** Which edge the drag handle sits on. */
  handleSide?: "start" | "end";
  /** Keyboard resize increment in px. */
  step?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [size, setSize] = useState(defaultSize);
  const dragging = useRef(false);
  const origin = useRef({ pos: 0, size: defaultSize });

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    origin.current = { pos: axis === "x" ? e.clientX : e.clientY, size };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const current = axis === "x" ? e.clientX : e.clientY;
    let delta = current - origin.current.pos;
    if (handleSide === "start") delta = -delta;
    setSize(clamp(origin.current.size + delta));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const grow = axis === "x" ? "ArrowRight" : "ArrowDown";
    const shrink = axis === "x" ? "ArrowLeft" : "ArrowUp";
    const sign = handleSide === "start" ? -1 : 1;
    if (e.key === grow) setSize((s) => clamp(s + step * sign));
    else if (e.key === shrink) setSize((s) => clamp(s - step * sign));
    else if (e.key === "Home") setSize(min);
    else if (e.key === "End") setSize(max);
    else return;
    e.preventDefault();
  };

  const isX = axis === "x";
  const handleOnStart = handleSide === "start";

  return (
    <div
      className={cn("relative min-h-0 shrink-0", className)}
      style={isX ? { width: size } : { height: size }}
    >
      {children}

      <div
        role="separator"
        aria-orientation={isX ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(size)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label="Resize panel"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          "group absolute z-10 flex touch-none items-center justify-center",
          "focus:outline-none",
          isX
            ? cn("top-0 bottom-0 w-2 cursor-col-resize", handleOnStart ? "-left-1" : "-right-1")
            : cn("left-0 right-0 h-2 cursor-row-resize", handleOnStart ? "-top-1" : "-bottom-1"),
        )}
      >
        {/* The visible hairline, brightened on hover/focus */}
        <span
          className={cn(
            "bg-line transition-colors group-hover:bg-amber group-focus:bg-amber",
            isX ? "h-full w-px" : "h-px w-full",
          )}
        />
      </div>
    </div>
  );
}
