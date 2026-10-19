import { Fragment } from "react";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { FieldRow } from "./builder-field-row";

interface Props {
  st: BuilderState;
  ops: FieldOps;
}

/** Liste des champs du modèle, cible du glisser-déposer palette/lignes. */
export function FieldsList({ st, ops }: Props) {
  const { listRef, fields, dragOver, setDragOver } = st;
  const { handleDragOver, handleDrop } = ops;

  return (
    <ul
      ref={listRef}
      className="flex flex-col gap-2"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null);
      }}
    >
      {fields.length === 0 && (
        <li className="flex min-h-24 items-center justify-center border border-dashed border-border px-3 text-center text-xs text-muted">
          Aucun champ — glissez-en un depuis la palette de droite
        </li>
      )}
      {fields.map((field, i) => (
        <Fragment key={i}>
          {dragOver === i && <li role="presentation" aria-hidden className="h-0.5 bg-accent" />}
          <FieldRow st={st} ops={ops} field={field} index={i} />
        </Fragment>
      ))}
      {dragOver === fields.length && (
        <li role="presentation" aria-hidden className="h-0.5 bg-accent" />
      )}
    </ul>
  );
}
