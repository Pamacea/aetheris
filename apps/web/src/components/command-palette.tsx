"use client";

import { CommandPaletteOverlay } from "./command-palette-overlay";
import { useCommandPalette } from "./use-command-palette";

/**
 * Command palette universelle (Ctrl/Cmd+K).
 * Rend le bouton d'ouverture (à placer dans la nav) + l'overlay.
 * Pattern combobox/listbox : focus piégé sur la saisie, option active
 * suivie par aria-activedescendant, retour de focus à la fermeture.
 */
export function CommandPalette() {
  const p = useCommandPalette();

  return (
    <>
      <button
        type="button"
        className="btn border-transparent px-2 py-1.5 text-xs text-muted hover:text-foreground"
        onClick={p.openPalette}
        aria-haspopup="dialog"
        aria-expanded={p.open}
        // le libellé doit contenir le texte visible (axe label-content-name-mismatch)
        aria-label="Ouvrir la palette de commandes (⌘K)"
      >
        ⌘K
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
