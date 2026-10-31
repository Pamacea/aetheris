import { useEffect, useState } from "react";
import { fieldLayout, GRID_COLS, GRID_GAP_PX } from "@aetheris/shared";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { FieldRow } from "./builder-field-row";
import { ROW_STRIDE } from "./builder-layout";

interface Props {
  st: BuilderState;
  ops: FieldOps;
}

/** Canvas 2D des champs : cartes positionnées librement sur une grille 12 colonnes. */
export function FieldsList({ st, ops }: Props) {
  const { listRef, fields } = st;
  const { handleDragOver, handleDrop } = ops;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [listRef]);

  const bottom = fields.reduce((max, f) => Math.max(max, fieldLayout(f).y + fieldLayout(f).h), 0);
  const height = Math.max(96, (bottom + 2) * ROW_STRIDE);

  return (
    <div
      ref={listRef}
      data-canvas
      className="relative w-full flex-1 overflow-visible"
      style={{
        minHeight: height,
        // Pas horizontal = (largeur - 11 gaps) / 12 + gap, soit le stride des
        // colonnes ; pas vertical = GRID_ROW_PX + GRID_GAP_PX. Point à 1px du
        // coin puis tuile décalée de -1px : le centre tombe sur le coin de cellule.
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(245,158,11,0.10) 1px, transparent 1px)",
        backgroundPosition: "-1px -1px",
        backgroundSize: `calc((100% - ${(GRID_COLS - 1) * GRID_GAP_PX}px) / ${GRID_COLS} + ${GRID_GAP_PX}px) ${ROW_STRIDE}px`,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {fields.every((f) => f.kind === "css") && (
        <p className="absolute inset-0 flex items-center justify-center border border-dashed border-border px-3 text-center text-xs text-muted">
          Aucun champ — glissez-en un depuis la palette de droite
        </p>
      )}
      {/* Les champs « css » hérités restent dans le schéma (leur CSS s'applique
          toujours aux fiches) mais ne s'affichent plus dans le canvas. */}
      {fields.map((field, i) =>
        field.kind === "css" ? null : (
          <div key={i} data-field-id={field.id} className="contents">
            <FieldRow st={st} ops={ops} field={field} index={i} containerWidth={width} />
          </div>
        ),
      )}
    </div>
  );
}
