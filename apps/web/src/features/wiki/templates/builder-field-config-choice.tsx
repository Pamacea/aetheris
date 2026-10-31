import type { TemplateField } from "@aetheris/shared";
import type { FieldOps } from "./builder-ops";
import { FieldInput } from "./builder-field-input";

interface Props {
  field: TemplateField;
  index: number;
  patchField: FieldOps["patchField"];
  campaignId: string;
}

/** Configuration des champs de choix : select / multiSelect, toggle, tag. */
export function FieldConfigChoice({ field, index: i, patchField, campaignId }: Props) {
  return (
    <>
      {(field.kind === "select" || field.kind === "multiSelect") && (
        <>
          <label className="flex min-h-7 items-center justify-between gap-2">
            <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">
              Source
            </span>
            <select
              className="input h-7 w-40 min-w-0 px-2 py-0 text-xs"
              name={`champ-${field.id}-source`}
              value={field.source ?? "static"}
              onChange={(e) =>
                patchField(i, (f) =>
                  f.kind === "select" || f.kind === "multiSelect"
                    ? {
                        ...f,
                        source: e.target.value as "static" | "wiki",
                      }
                    : f,
                )
              }
            >
              <option value="static">Liste d’options</option>
              <option value="wiki">Notes de la campagne</option>
            </select>
          </label>
          <FieldInput
            label="Catégorie cible"
            value={field.targetCategory ?? ""}
            placeholder="ex. Encyclopédie"
            list={`${campaignId}-tagcat`}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "select" || f.kind === "multiSelect"
                  ? { ...f, targetCategory: v || undefined }
                  : f,
              )
            }
          />
          <label className="flex items-center gap-2 pb-1 text-xs text-muted">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              name={`champ-${field.id}-champ-libre`}
              checked={field.free === true}
              onChange={(e) =>
                patchField(i, (f) =>
                  f.kind === "select" || f.kind === "multiSelect"
                    ? { ...f, free: e.target.checked || undefined }
                    : f,
                )
              }
            />
            Champ libre
          </label>
        </>
      )}
      {field.kind === "toggle" && (
        <label className="flex items-center gap-2 pb-1 text-xs text-muted">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--accent)]"
            name={`champ-${field.id}-active-par-defaut`}
            checked={field.default === true}
            onChange={(e) =>
              patchField(i, (f) => (f.kind === "toggle" ? { ...f, default: e.target.checked } : f))
            }
          />
          Activé par défaut
        </label>
      )}
      {field.kind === "tag" && (
        <>
          <FieldInput
            label="Catégorie cible (filtrage)"
            value={field.targetCategory ?? ""}
            placeholder="ex. Encyclopédie"
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "tag" ? { ...f, targetCategory: v || undefined } : f,
              )
            }
            list={`${campaignId}-tagcat`}
          />
          <label className="flex items-center gap-2 pb-1 text-xs text-muted">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              name={`champ-${field.id}-selection-multiple`}
              checked={field.multiple === true}
              onChange={(e) =>
                patchField(i, (f) =>
                  f.kind === "tag" ? { ...f, multiple: e.target.checked || undefined } : f,
                )
              }
            />
            Sélection multiple
          </label>
        </>
      )}
    </>
  );
}
