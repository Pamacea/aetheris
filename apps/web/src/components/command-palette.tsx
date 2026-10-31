"use client";

import { CommandPaletteOverlay } from "./command-palette-overlay";
import type { PaletteEntry } from "./command-palette-commands";
import { useCommandPalette } from "./use-command-palette";

/**
 * Command palette universelle (Ctrl/Cmd+K).
 * Rend le bouton d'ouverture (à placer dans la nav) + l'overlay.
 * Pattern combobox/listbox : focus piégé sur la saisie, option active
 * suivie par aria-activedescendant, retour de focus à la fermeture.
 */
export function CommandPalette({
  campaigns,
  novels,
}: {
  campaigns: PaletteEntry[];
  novels: PaletteEntry[];
}) {
  const p = useCommandPalette({ campaigns, novels });

  return (
    <>
      <button
        type="button"
        className="btn border-transparent px-2 py-1.5 text-xs text-muted hover:text-foreground"
        onClick={p.openPalette}
        aria-haspopup="dialog"
        aria-expanded={p.open}
        aria-label="Ouvrir la palette de commandes (Ctrl / ⌘ K)"
        title="Rechercher (Ctrl / ⌘ K)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {p.open && (
        <CommandPaletteOverlay
          query={p.query}
          onQueryChange={p.setQuery}
          onKeyDown={p.onKeyDown}
          inputRef={p.inputRef}
          listRef={p.listRef}
          filtered={p.filtered}
          activeClamped={p.activeClamped}
          onExecute={p.execute}
          onActiveChange={p.onActiveChange}
          onClose={p.close}
        />
      )}
    </>
  );
}
