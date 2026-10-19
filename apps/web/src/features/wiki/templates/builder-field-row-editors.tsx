import type { TemplateField } from "@aetheris/shared";
import type { BuilderState } from "./builder-state";
import type { FieldOps } from "./builder-ops";
import { ColumnsEditor } from "./builder-columns-editor";
import { OptionsEditor } from "./builder-options-editor";

interface Props {
  st: BuilderState;
  ops: FieldOps;
  field: TemplateField;
  index: number;
}

/** Ligne 3 d'un champ : options (select/multiSelect) + colonnes (list) + aide. */
export function FieldRowEditors({ st, ops, field, index }: Props) {
  const i = index;
  const { openCfg, campaignId } = st;
  const { patchField, patchColumn } = ops;

  return (
    <>
      {openCfg.has(i) &&
        (field.kind === "select" || field.kind === "multiSelect") &&
        field.source !== "wiki" && (
          <OptionsEditor
            options={field.options}
            onChange={(next) =>
              patchField(i, (f) =>
                f.kind === "select" || f.kind === "multiSelect" ? { ...f, options: next } : f,
              )
            }
          />
        )}

      {openCfg.has(i) && field.kind === "list" && (
        <ColumnsEditor
          field={field}
          index={i}
          patchField={patchField}
          patchColumn={patchColumn}
          campaignId={campaignId}
        />
      )}

      {openCfg.has(i) && (
        <div className="flex items-center gap-2 border-t border-border pt-2">
          <span className="text-[0.6rem] tracking-widest text-muted uppercase">Aide</span>
          <input
            className="input flex-1 py-0.5 text-xs"
            name={`champ-${field.id}-aide`}
            value={field.help ?? ""}
            placeholder="Texte d’info-bulle affiché sous le champ (optionnel)"
            onChange={(e) =>
              patchField(i, (f) => ({
                ...f,
                help: e.target.value || undefined,
              }))
            }
          />
        </div>
      )}
    </>
  );
}
