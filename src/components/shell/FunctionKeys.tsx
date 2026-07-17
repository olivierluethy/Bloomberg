"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/store/ui";

/**
 * The bottom function-key bar: solid rectangular blocks with bold black text.
 * Yellow for context jumps, red for cancel, green for go.
 *
 * Every key is bound to something the app already does — the coloured blocks are
 * a second surface for existing navigation and overlay actions, not new
 * features. CANCEL mirrors Escape's precedence exactly (palette, then the modal
 * stack, then the workspace) so the two can't disagree about what "close" means.
 */
export function FunctionKeys() {
  const router = useRouter();
  const openPalette = useUIStore((s) => s.openPalette);
  const closePalette = useUIStore((s) => s.closePalette);
  const closeModal = useUIStore((s) => s.closeModal);
  const closeWorkspace = useUIStore((s) => s.closeWorkspace);
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const modalCount = useUIStore((s) => s.modals.length);
  const workspaceOpen = useUIStore((s) => s.workspaceSymbol !== null);

  const anyOpen = paletteOpen || modalCount > 0 || workspaceOpen;

  const cancel = () => {
    if (paletteOpen) closePalette();
    else if (modalCount > 0) closeModal();
    else if (workspaceOpen) closeWorkspace();
  };

  return (
    /*
      z-[60] puts the bar above the overlay backdrop (z-50). Without it CANCEL is
      unclickable in exactly the state it exists for: it enables only when an
      overlay is open, and that overlay's full-screen backdrop then swallows the
      click. The bar is terminal chrome and stays live over a dialog, like the
      real thing.
    */
    <div
      className="relative z-[60] flex h-5 shrink-0 items-stretch text-2xs"
      role="toolbar"
      aria-label="Function keys"
    >
      <Key tone="yellow" onClick={() => router.push("/stocks")}>
        EQUITY
      </Key>
      <Key tone="yellow" onClick={() => router.push("/bonds")}>
        CORP
      </Key>
      <Key tone="yellow" onClick={() => router.push("/portfolio")}>
        PORT
      </Key>
      {/* Nothing open means nothing to cancel — the key says so rather than
          silently doing nothing when pressed. */}
      <Key tone="red" onClick={cancel} disabled={!anyOpen}>
        CANCEL
      </Key>
      <Key tone="green" onClick={openPalette}>
        GO
      </Key>
      <div className="flex-1 border-t border-line bg-void" />
    </div>
  );
}

const TONES = {
  yellow: "bg-key-yellow",
  red: "bg-key-red",
  green: "bg-up",
} as const;

function Key({
  tone,
  onClick,
  disabled,
  children,
}: {
  tone: keyof typeof TONES;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "border-r border-black px-2.5 font-bold text-black transition-opacity",
        TONES[tone],
        disabled && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}
