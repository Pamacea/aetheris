"use client";

import { useEffect, useRef, useState } from "react";
import { BlocksIcon } from "@/components/icons";
import { PALETTE_SECTIONS, type BlockPayload } from "./block-defs";

/**
 * Palette de blocs : bouton « + Blocs » et popover ancré, style slash
 * command. Clic = insertion à la sélection courante (le mousedown est
 * neutralisé pour que l'éditeur garde son curseur). Fermeture au clic
 * extérieur et sur Échap.
 */
export function BlocksPalette({
  onInsert,
  className = "btn px-2.5 py-1 text-xs",
}: {
  onInsert: (payload: BlockPayload) => void;
  /** Style du déclencheur (l'en-tête y passe son bouton de barre d'outils). */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as globalThis.Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={className}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="wiki-blocks-menu"
        title="Insérer un bloc"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        <BlocksIcon />
        Blocs
      </button>

      {open && (
        <div
          id="wiki-blocks-menu"
          role="menu"
          aria-label="Blocs à insérer"
          className="absolute top-full left-0 z-30 mt-1 max-h-[70vh] w-72 overflow-y-auto border border-border bg-card shadow-lg"
        >
          {PALETTE_SECTIONS.map((section) => (
            <section key={section.id} className="border-b border-border p-1.5 last:border-b-0">
              <p className="px-2 py-1 text-[0.6rem] tracking-widest text-muted uppercase">
                {section.label}
              </p>
              <ul>
                {section.blocks.map((def) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onInsert(def.payload);
                        setOpen(false);
                      }}
                      className="flex w-full items-start gap-2 px-2 py-1.5 text-left transition hover:bg-card-hover"
                    >
                      <span aria-hidden className="mt-0.5 w-5 shrink-0 text-xs text-accent">
                        {def.glyph}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-foreground">{def.label}</span>
                        <span className="block text-[0.6rem] text-muted">{def.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
