import type { ListColumn, TemplateField } from "@aetheris/shared";
import type { FieldOps } from "./builder-ops";
import { FieldInput } from "./builder-field-input";
import { OptionsEditor } from "./builder-options-editor";

interface Props {
  field: Extract<TemplateField, { kind: "list" }>;
  index: number;
  patchField: FieldOps["patchField"];
  patchColumn: FieldOps["patchColumn"];
  campaignId: string;
}

/** Éditeur des colonnes d'un champ « liste répétable ». */
export function ColumnsEditor({ field, index: i, patchField, patchColumn, campaignId }: Props) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] tracking-widest text-muted uppercase">Colonnes</span>
        <button
          type="button"
          className="btn px-2 py-0.5 text-xs text-accent"
          disabled={field.columns.length >= 12}
          onClick={() =>
            patchField(i, (f) =>
              f.kind === "list"
                ? {
                    ...f,
                    columns: [
                      ...f.columns,
                      {
                        id: `colonne${f.columns.length + 1}`,
                        label: `Colonne ${f.columns.length + 1}`,
                        type: "text",
                      },
                    ],
                  }
                : f,
            )
          }
        >
          + Colonne
        </button>
      </div>
      {field.columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1.5 border border-border bg-background p-1.5">
          <div className="flex flex-wrap items-end gap-2">
            <FieldInput
              label="Libellé"
              value={col.label}
              onChange={(v) => patchColumn(i, ci, (c) => ({ ...c, label: v }))}
            />
            <FieldInput
              label="Id"
              mono
              value={col.id}
              onChange={(v) => patchColumn(i, ci, (c) => ({ ...c, id: v }))}
            />
            <label className="flex flex-col gap-0.5">
              <span className="text-[0.6rem] tracking-widest text-muted uppercase">Type</span>
              <select
                className="input w-32 py-1 text-xs"
                name={`colonne-${col.id}-type`}
                value={col.type}
                onChange={(e) =>
                  patchColumn(i, ci, (c) => ({
                    ...c,
                    type: e.target.value as ListColumn["type"],
                  }))
                }
              >
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="select">Liste</option>
                <option value="tag">Lien wiki</option>
              </select>
            </label>
            <button
              type="button"
              className="btn px-2 py-0.5 text-xs text-destructive"
              disabled={field.columns.length <= 1}
              onClick={() =>
                patchField(i, (f) =>
                  f.kind === "list" ? { ...f, columns: f.columns.filter((_, j) => j !== ci) } : f,
                )
              }
            >
              ✕
            </button>
          </div>
          {col.type === "select" && (
            <OptionsEditor
              options={col.options ?? []}
              onChange={(next) => patchColumn(i, ci, (c) => ({ ...c, options: next }))}
            />
          )}
          {col.type === "tag" && (
            <FieldInput
              label="Catégorie cible"
              list={`${campaignId}-tagcat`}
              value={col.targetCategory ?? ""}
              onChange={(v) =>
                patchColumn(i, ci, (c) => ({
                  ...c,
                  targetCategory: v || undefined,
                }))
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
