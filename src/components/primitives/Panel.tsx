import { cn } from "@/lib/cn";

/**
 * Standard panel chrome: a hairline-bordered surface with an eyebrow + title
 * header and an optional action slot. Every module composes its content inside
 * one of these so density and spacing stay consistent across the app.
 */
export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
  scroll = false,
}: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When true, the body scrolls internally instead of growing the panel. */
  scroll?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col border border-line bg-panel",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 flex-col">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
        </div>
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
