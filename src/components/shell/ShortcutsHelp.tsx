"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/primitives/Modal";
import { SHORTCUTS, SHORTCUT_GROUPS, displayKeys } from "@/config/shortcuts";
import { useIsModalOpen, useUIStore } from "@/store/ui";

/**
 * The keyboard reference, rendered straight from the shortcut registry — so it
 * lists exactly what the app implements, no more and no less.
 */
export function ShortcutsHelp() {
  const open = useIsModalOpen("shortcuts");
  const closeModal = useUIStore((s) => s.closeModal);
  const isMac = useIsMac();

  return (
    <Modal open={open} onClose={closeModal} labelledBy="shortcuts-title" className="max-w-lg">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex flex-col">
          <span className="eyebrow">Reference</span>
          <h2 id="shortcuts-title" className="text-sm font-semibold text-fg">
            Keyboard Shortcuts
          </h2>
        </div>
        <button
          type="button"
          onClick={closeModal}
          className="border border-line px-2 py-1 font-mono text-2xs text-fg-dim transition-colors hover:border-line-bright hover:text-fg"
        >
          ESC
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {SHORTCUT_GROUPS.map((group) => {
          const items = SHORTCUTS.filter((s) => s.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group}>
              <h3 className="eyebrow border-b border-line bg-elevated px-3 py-1">{group}</h3>
              <ul>
                {items.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 border-b border-line px-3 py-1.5 last:border-0">
                    <span className="min-w-0 flex-1 text-sm text-fg-dim">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {displayKeys(s.keys, isMac).map((k, i) => (
                        <kbd
                          key={i}
                          className="border border-line bg-void px-1.5 py-0.5 font-mono text-2xs text-fg"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="shrink-0 border-t border-line px-3 py-1.5 text-2xs text-fg-faint">
        Typing in a field suspends these — except the palette, which is always one key away.
      </footer>
    </Modal>
  );
}

/**
 * Mac vs not, resolved after mount: the server can't know, and rendering ⌘ to a
 * Windows user (or vice versa) is a small lie. Defaults to the non-Mac form,
 * which is also what the server renders, so the first paint agrees.
 */
function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const detect = () => {
      const platform =
        (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
        navigator.platform ??
        "";
      setIsMac(/mac|iphone|ipad/i.test(platform));
    };
    detect();
  }, []);

  return isMac;
}
