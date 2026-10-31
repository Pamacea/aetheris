"use client";

import { useState } from "react";
import { PALETTE_SECTIONS } from "./block-defs";
import { BLOCK_MIME, type BlockDragPayload } from "./blocks-dnd";

/**
 * Scrollbar visible, discrète (DA : tokens, coins du panneau intacts) —
 * variante « thin » de `.no-scrollbar` (globals.css est hors périmètre
 * d'édition de cette feature, les propriétés arbitraires Tailwind suffisent).
 */
const SCROLL_THIN =
  "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] " +
  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-accent-2";

/**
 * Palette de blocs au-dessus de l'entrée, sticky dans la zone d'édition :
 * ouverture « + Blocs », clic pour insérer à la sélection, drag pour déposer
 * à la position visée. Les définitions viennent de la source unique
 * (`block-defs.ts`), partagée avec le menu slash.
 */
export function BlocksPalette({ onInsert }: { onInsert: (payload: BlockDragPayload) => void }) {
  const [open, setOpen] = useState(false);
  const [gm, setGm] = useState(false);

  const chipPayload = (p: BlockDragPayload): BlockDragPayload => (gm ? { ...p, gm: true } : p);
  const scopeCls = (active: boolean) =>
    `btn px-2 py-0.5 text-xs ${active ? "border-accent text-accent" : ""}`;
  // Le bouton ne prend pas le focus : la sélection de l'éditeur reste active.
  const keepEditorFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="sticky top-0 z-20 -mx-5 flex flex-col gap-2 border-b border-border bg-background px-5 py-2 md:-mx-10 md:px-10">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          aria-expanded={open}
          aria-controls="wiki-blocks-palette"
          onMouseDown={keepEditorFocus}
          onClick={() => setOpen((o) => !o)}
        >
          + Blocs
        </button>
        <p className="text-[0.6rem] tracking-widest text-muted uppercase">
          {open ? "Glissez dans l’entrée — ou cliquez pour insérer" : "Palette de blocs"}
        </p>
        <div
          className="ml-auto flex items-center gap-1.5"
          role="group"
          aria-label="Portée des blocs insérés"
        >
          <span className="text-[0.6rem] tracking-widest text-muted uppercase">Portée</span>
          <button
            type="button"
            className={scopeCls(!gm)}
            aria-pressed={!gm}
            onMouseDown={keepEditorFocus}
            onClick={() => setGm(false)}
          >
            Tous
          </button>
          <button
            type="button"
            className={scopeCls(gm)}
            aria-pressed={gm}
            onMouseDown={keepEditorFocus}
            onClick={() => setGm(true)}
          >
            MJ
          </button>
        </div>
      </div>

      {open && (
        <div
          id="wiki-blocks-palette"
          className={`${SCROLL_THIN} max-h-64 overflow-y-auto pr-1 pb-1`}
        >
          {PALETTE_SECTIONS.map((section) => (
            <section key={section.id} className="mb-3 last:mb-0">
              <h3 className="mb-1 text-[0.6rem] tracking-widest text-muted uppercase">
                {section.label}
              </h3>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {section.blocks.map((def) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "copy";
                        e.dataTransfer.setData(
                          BLOCK_MIME,
                          JSON.stringify(chipPayload(def.payload)),
                        );
                      }}
                      onClick={() => onInsert(chipPayload(def.payload))}
                      title={`Glisser dans l’entrée ou cliquer pour insérer — ${def.description}${gm ? " · MJ" : ""}`}
                      className="flex w-full cursor-grab items-start gap-2 border border-border bg-background px-2 py-1.5 text-left hover:border-accent hover:bg-card-hover active:cursor-grabbing"
                    >
                      <span aria-hidden className="mt-0.5 text-xs text-accent">
                        {def.glyph}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-foreground">{def.label}</span>
                        <span className="block text-[0.6rem] text-muted">{def.description}</span>
                      </span>
                      {gm && (
                        <span className="ml-auto text-[0.55rem] tracking-widest text-accent uppercase">
                          MJ
                        </span>
                      )}
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
