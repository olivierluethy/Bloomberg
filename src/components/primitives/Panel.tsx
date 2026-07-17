import { cn } from "@/lib/cn";

/**
 * Standard panel chrome: a hairline-bordered surface under a solid blue header
 * bar with bold amber2 text. Every module composes its content inside one of
 * these so density and panel grammar stay consistent across the app.
 *
 * Headers are prefixed ("1) MARKET OVERVIEW", "MKT) MARKETS") per the terminal
 * convention, where the prefix is what you'd type to reach the panel. The prefix
 * is supplied by the caller via `tag` rather than counted automatically — panels
 * mount conditionally on load state, and a self-counting scheme would renumber
 * them as data lands, which is exactly what the convention exists to prevent.
 */
export function Panel({
  title,
  tag,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
  scroll = false,
}: {
  title: string;
  /** Header prefix — a panel number ("1") or module mnemonic ("MKT"). */
  tag?: string;
  /** Secondary qualifier, shown alongside the title in the header bar. */
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When true, the body scrolls internally instead of growing the panel. */
  scroll?: boolean;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col border border-line bg-panel", className)}>
      <header className="flex items-center justify-between gap-2 bg-blue px-1.5 py-0.5">
        <h2 className="flex min-w-0 items-baseline gap-1.5 text-xs font-bold text-amber2 uppercase">
          {tag ? <span aria-hidden>{tag})</span> : null}
          <span className="truncate">{title}</span>
          {eyebrow ? <span className="shrink-0 text-2xs font-normal">{eyebrow}</span> : null}
        </h2>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      {/*
        A scrolling body is focusable so it can be scrolled from the keyboard.
        Panels whose rows are all buttons or links are reachable anyway, but the
        news feed's mock items have no URL, so nothing inside them takes focus —
        without this the content is simply unreachable without a mouse.
      */}
      <div
        className={cn("min-h-0 flex-1", scroll && "overflow-auto", bodyClassName)}
        {...(scroll ? { tabIndex: 0, role: "region", "aria-label": title } : {})}
      >
        {children}
      </div>
    </section>
  );
}
