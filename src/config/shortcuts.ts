/**
 * The keyboard map — one source of truth for the handler and the help screen.
 *
 * A shortcut list that lives in a help modal, separate from the code that
 * implements it, is a list of promises the app stops keeping. Here each entry
 * carries its own matcher, so a key that isn't in this file does nothing, and a
 * key in this file is always documented.
 */

export type ShortcutId =
  | "palette"
  | "help"
  | "toggleNav"
  | "prevModule"
  | "nextModule"
  | "jumpModule"
  | "watchlists"
  | "closeOverlay";

export interface Shortcut {
  id: ShortcutId;
  /** Display form. `mod` renders as ⌘ on Mac and Ctrl elsewhere. */
  keys: string;
  label: string;
  group: "Global" | "Navigation" | "Workspace";
  /**
   * Whether the key fires while focus is in a text field. Almost nothing should:
   * typing "b" in the trade form must not collapse the nav.
   */
  whileTyping?: boolean;
  /** Matched against the event. Absent for keys another component owns. */
  match?: (e: KeyboardEvent) => boolean;
}

const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;
const plain = (e: KeyboardEvent) => !e.metaKey && !e.ctrlKey && !e.altKey;

export const SHORTCUTS: Shortcut[] = [
  {
    id: "palette",
    keys: "mod+K",
    label: "Open the command palette",
    group: "Global",
    whileTyping: true,
    match: (e) => mod(e) && e.key.toLowerCase() === "k",
  },
  {
    id: "help",
    keys: "?",
    label: "Show keyboard shortcuts",
    group: "Global",
    match: (e) => plain(e) && e.key === "?",
  },
  {
    id: "closeOverlay",
    keys: "Esc",
    label: "Close the palette, a dialog, or the workspace",
    group: "Global",
    // Owned by Modal, which needs it scoped to the focused dialog. Listed so the
    // help screen tells the whole truth.
  },
  {
    id: "toggleNav",
    keys: "mod+B",
    label: "Collapse or expand the module rail",
    group: "Navigation",
    match: (e) => mod(e) && e.key.toLowerCase() === "b",
  },
  {
    id: "prevModule",
    keys: "[",
    label: "Previous module",
    group: "Navigation",
    match: (e) => plain(e) && e.key === "[",
  },
  {
    id: "nextModule",
    keys: "]",
    label: "Next module",
    group: "Navigation",
    match: (e) => plain(e) && e.key === "]",
  },
  {
    id: "jumpModule",
    keys: "alt+1…9",
    label: "Jump to a module by position",
    group: "Navigation",
    match: (e) => e.altKey && !mod(e) && /^[1-9]$/.test(e.key),
  },
  {
    id: "watchlists",
    keys: "mod+E",
    label: "Edit watchlists",
    group: "Workspace",
    match: (e) => mod(e) && e.key.toLowerCase() === "e",
  },
];

/**
 * Renders a key combo for the current platform. Mac users read ⌘; everyone else
 * reads Ctrl, and showing them the wrong one is a small lie that costs trust.
 */
export function displayKeys(keys: string, isMac: boolean): string[] {
  return keys.split("+").map((k) => {
    if (k === "mod") return isMac ? "⌘" : "Ctrl";
    if (k === "alt") return isMac ? "⌥" : "Alt";
    return k;
  });
}

export const SHORTCUT_GROUPS: Shortcut["group"][] = ["Global", "Navigation", "Workspace"];
