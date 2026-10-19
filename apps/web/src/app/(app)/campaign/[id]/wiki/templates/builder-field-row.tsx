import type { TemplateField } from "@aetheris/shared";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { FieldRowConfig } from "./builder-field-row-config";
import { FieldRowEditors } from "./builder-field-row-editors";

interface Props {
  st: BuilderState;
  ops: FieldOps;
  field: TemplateField;
  index: number;
}

/** Une ligne de champ de la liste : libellé/identifiant/actions + config. */
export function FieldRow({ st, ops, field, index: i }: Props) {
  const { fields, openCfg, setDrag } = st;
  const { patchField, moveField, setFields, toggleCfg, handleDragEnd } = ops;

  return (
    <li data-field-row className="flex flex-col gap-2 border border-border bg-card p-3">
      {/* Ligne 1 : libellé + identifiant + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", `row:${i}`);
            setDrag({ source: "row", index: i });
          }}
          onDragEnd={handleDragEnd}
          title="Glisser pour réordonner"
          className="cursor-grab select-none px-0.5 text-muted hover:text-accent active:cursor-grabbing"
        >
          ⠿
        </span>
        <input
          className="input min-w-40 flex-1 py-1 text-sm"
          name={`champ-${field.id}-libelle`}
          value={field.label}
          placeholder="Libellé"
          onChange={(e) =>
            patchField(i, (f) => ({
              ...f,
              label: e.target.value,
            }))
          }
        />
        <input
          className="input w-36 py-1 font-mono text-xs"
          name={`champ-${field.id}-identifiant`}
          value={field.id}
          placeholder="identifiant"
          onChange={(e) =>
            patchField(i, (f) => ({
              ...f,
              id: e.target.value,
            }))
          }
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn px-2 py-1 text-xs"
            aria-expanded={openCfg.has(i)}
            aria-label={`Configuration du champ ${field.label}`}
            title="Configuration du champ"
            onClick={() => toggleCfg(i)}
          >
            ⚙
          </button>
          <button
            type="button"
            className="btn px-2 py-1 text-xs"
            onClick={() => moveField(i, -1)}
            disabled={i === 0}
            title="Monter"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn px-2 py-1 text-xs"
            onClick={() => moveField(i, 1)}
            disabled={i === fields.length - 1}
            title="Descendre"
          >
            ↓
          </button>
          <button
            type="button"
            className="btn px-2 py-1 text-xs text-destructive"
            onClick={() => setFields(fields.filter((_, j) => j !== i))}
            title="Retirer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Ligne 2 : type + configuration spécifique */}
      <FieldRowConfig st={st} ops={ops} field={field} index={i} />

      {/* Ligne 3 : options (select/multiSelect) + colonnes (list) + aide */}
      <FieldRowEditors st={st} ops={ops} field={field} index={i} />
    </li>
  );
}
