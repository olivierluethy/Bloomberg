"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/Modal";
import { cn } from "@/lib/cn";
import { symbolName } from "@/config/symbols";
import { useIsModalOpen, useUIStore } from "@/store/ui";
import { useWatchlistHydration, useWatchlistStore } from "@/store/watchlists";

/**
 * Watchlist editor: create, rename, reorder, and delete lists, and curate the
 * symbols inside the selected one.
 *
 * Symbols reorder by dragging or with the ↑/↓ buttons. Both, deliberately:
 * dragging is the fast path, but it can't be reached by keyboard and says
 * nothing to a screen reader, so it's an addition to the buttons and never a
 * replacement for them.
 */
export function WatchlistManager() {
  const open = useIsModalOpen("watchlists");
  const seq = useUIStore((s) => s.modalSeq);
  const closeModal = useUIStore((s) => s.closeModal);
  const hydrated = useWatchlistHydration();

  // Keyed by the open counter so the body's "which list am I editing" state
  // starts from the active list on every open — no effect to resync it, and no
  // stale selection when a reopen interrupts the close animation.
  return (
    <Modal open={open && hydrated} onClose={closeModal} labelledBy="watchlists-title" className="max-w-3xl">
      <ManagerBody key={seq} onClose={closeModal} />
    </Modal>
  );
}

function ManagerBody({ onClose }: { onClose: () => void }) {
  const lists = useWatchlistStore((s) => s.lists);
  const activeId = useWatchlistStore((s) => s.activeId);
  const setActive = useWatchlistStore((s) => s.setActive);
  const createList = useWatchlistStore((s) => s.createList);
  const renameList = useWatchlistStore((s) => s.renameList);
  const deleteList = useWatchlistStore((s) => s.deleteList);
  const reorderLists = useWatchlistStore((s) => s.reorderLists);
  const removeSymbol = useWatchlistStore((s) => s.removeSymbol);
  const moveSymbol = useWatchlistStore((s) => s.moveSymbol);

  // Which list is being edited in this dialog — not necessarily the active one.
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = lists.find((l) => l.id === selectedId) ?? lists[0];

  // Drag-reorder state. The ↑/↓ buttons stay: dragging is the fast path, but it
  // is not reachable by keyboard or announced to a screen reader, so it can only
  // ever be an addition to them, never a replacement.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <>
      <header className="flex items-center justify-between border-b border-line px-1.5 py-0.5">
        <div className="flex flex-col">
          <span className="eyebrow">Workspace</span>
          <h2 id="watchlists-title" className="text-sm font-semibold text-fg">
            Manage Watchlists
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-line px-1.5 py-1 font-mono text-2xs text-fg-dim transition-colors hover:border-line-bright hover:text-fg"
        >
          CLOSE
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[240px_1fr]">
        <div className="flex min-h-0 flex-col border-b border-line sm:border-b-0 sm:border-r">
          <div className="eyebrow px-1.5 py-0.5">Lists</div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {lists.map((list, i) => (
              <ListRow
                key={list.id}
                name={list.name}
                count={list.symbols.length}
                selected={list.id === selected?.id}
                active={list.id === activeId}
                canDelete={lists.length > 1}
                canMoveUp={i > 0}
                canMoveDown={i < lists.length - 1}
                onSelect={() => setSelectedId(list.id)}
                onRename={(name) => renameList(list.id, name)}
                onDelete={() => {
                  deleteList(list.id);
                  if (selectedId === list.id) setSelectedId(activeId);
                }}
                onMoveUp={() => reorderLists(i, i - 1)}
                onMoveDown={() => reorderLists(i, i + 1)}
                onMakeActive={() => setActive(list.id)}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setSelectedId(createList("New list"))}
            className="border-t border-line px-1.5 py-0.5 text-left text-sm text-amber transition-colors hover:bg-elevated"
          >
            + New list
          </button>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="eyebrow px-1.5 py-0.5">
            {selected ? `${selected.name} — ${selected.symbols.length} symbols` : "Symbols"}
          </div>
          {!selected || selected.symbols.length === 0 ? (
            <p className="px-1.5 py-3 text-center text-sm text-fg-faint">
              No symbols yet. Press <kbd className="border border-line px-1 font-mono text-2xs">⌘K</kbd> and pin
              one.
            </p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {selected.symbols.map((symbol, i) => (
                <li
                  key={symbol}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(i);
                    e.dataTransfer.effectAllowed = "move";
                    // Firefox refuses to start a drag without payload.
                    e.dataTransfer.setData("text/plain", symbol);
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setOverIndex(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== i) moveSymbol(selected.id, dragIndex, i);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={cn(
                    "group flex cursor-grab items-center gap-2 border-b border-line px-1.5 py-0.5 last:border-0 hover:bg-elevated",
                    dragIndex === i && "opacity-40",
                    // The insertion point, drawn on the edge the row will land on.
                    overIndex === i && dragIndex !== null && dragIndex !== i &&
                      (dragIndex < i ? "border-b-amber" : "border-t border-t-amber"),
                  )}
                >
                  <span className="w-3 shrink-0 text-center font-mono text-2xs text-fg-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                    ⠿
                  </span>
                  <span className="w-24 shrink-0 font-mono text-sm text-fg">{symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-dim">{symbolName(symbol)}</span>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <IconButton
                      label={`Move ${symbol} up`}
                      disabled={i === 0}
                      onClick={() => moveSymbol(selected.id, i, i - 1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label={`Move ${symbol} down`}
                      disabled={i === selected.symbols.length - 1}
                      onClick={() => moveSymbol(selected.id, i, i + 1)}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label={`Remove ${symbol}`}
                      onClick={() => removeSymbol(selected.id, symbol)}
                      danger
                    >
                      ✕
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function ListRow({
  name,
  count,
  selected,
  active,
  canDelete,
  canMoveUp,
  canMoveDown,
  onSelect,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMakeActive,
}: {
  name: string;
  count: number;
  selected: boolean;
  active: boolean;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMakeActive: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    onRename(draft);
    setEditing(false);
  };

  return (
    <li
      className={cn(
        "group border-l-2 transition-colors",
        selected ? "border-amber bg-elevated" : "border-transparent hover:bg-elevated",
      )}
    >
      <div className="flex items-center gap-1 px-1.5 py-0.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                // Stop the modal from closing — Escape here just cancels the edit.
                e.stopPropagation();
                setDraft(name);
                setEditing(false);
              }
            }}
            aria-label="Watchlist name"
            className="min-w-0 flex-1 border border-line-bright bg-void px-1 py-0.5 text-sm text-fg outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={onSelect}
            onDoubleClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left"
          >
            <span className={cn("truncate text-sm", selected ? "text-fg" : "text-fg-dim")}>{name}</span>
            {active && <span className="shrink-0 font-mono text-2xs text-amber">●</span>}
            <span className="ml-auto shrink-0 font-mono text-2xs text-fg-faint">{count}</span>
          </button>
        )}
      </div>

      {selected && !editing && (
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <TextButton onClick={() => setEditing(true)}>Rename</TextButton>
          {!active && <TextButton onClick={onMakeActive}>Set active</TextButton>}
          <IconButton label={`Move ${name} up`} disabled={!canMoveUp} onClick={onMoveUp}>
            ↑
          </IconButton>
          <IconButton label={`Move ${name} down`} disabled={!canMoveDown} onClick={onMoveDown}>
            ↓
          </IconButton>
          <IconButton label={`Delete ${name}`} disabled={!canDelete} onClick={onDelete} danger>
            ✕
          </IconButton>
        </div>
      )}
    </li>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-line px-1.5 py-0.5 text-2xs text-fg-dim transition-colors hover:border-line-bright hover:text-fg"
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "border border-line px-1.5 py-0.5 font-mono text-2xs transition-colors",
        disabled
          ? "cursor-not-allowed text-fg-faint/40"
          : danger
            ? "text-fg-dim hover:border-down/60 hover:text-down"
            : "text-fg-dim hover:border-line-bright hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
