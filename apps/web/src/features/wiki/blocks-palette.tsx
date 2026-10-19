"use client";

import { useState } from "react";
import { BLOCK_MIME, PALETTE_CHIPS, type BlockDragPayload } from "./blocks-dnd";

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
 * Palette de blocs au-dessus de l'entrée : ouverture « + Blocs », chips à
 * glisser dans l'entrée (drop au curseur de la souris) ou à cliquer
 * (insertion au curseur). La portée choisie ici s'applique à l'insertion ;
 * chaque bloc reste reconfigurable (case MJ) après coup.
 * La liste s'empile sur plusieurs lignes, bornée en hauteur avec scrollbar.
 */
export function BlocksPalette({ onInsert }: { onInsert: (payload: BlockDragPayload) => void }) {
  const [open, setOpen] = useState(false);
  const [gm, setGm] = useState(false);

  const chipPayload = (p: BlockDragPayload): BlockDragPayload => (gm ? { ...p, gm: true } : p);
  const scopeCls = (active: boolean) =>
    `btn px-2 py-0.5 text-xs ${active ? "border-accent text-accent" : ""}`;

  return (
    <div className="flex flex-col gap-2 border-b border-border px-5 py-2 md:px-10">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          aria-expanded={open}
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
            onClick={() => setGm(false)}
          >
            Tous
          </button>
          <button
            type="button"
            className={scopeCls(gm)}
            aria-pressed={gm}
            onClick={() => setGm(true)}
          >
            MJ
          </button>
        </div>
      </div>

      {open && (
        <ul className={`${SCROLL_THIN} flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pr-1 pb-1`}>
          {PALETTE_CHIPS.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData(BLOCK_MIME, JSON.stringify(chipPayload(c.payload)));
                }}
                onClick={() => onInsert(chipPayload(c.payload))}
                title={`Glisser dans l’entrée ou cliquer pour insérer — ${c.hint}${gm ? " · MJ" : ""}`}
                className="flex cursor-grab items-baseline gap-1.5 border border-border bg-background px-2 py-1 whitespace-nowrap hover:border-accent hover:bg-card-hover active:cursor-grabbing"
              >
                <span className="text-xs text-foreground">{c.title}</span>
                <span className="text-[0.6rem] text-muted uppercase">{gm ? "MJ" : c.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
