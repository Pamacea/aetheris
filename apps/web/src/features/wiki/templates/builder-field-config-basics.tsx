import type { TemplateField } from "@aetheris/shared";
import type { FieldOps } from "./builder-ops";
import { FieldInput } from "./builder-field-input";

interface Props {
  field: TemplateField;
  index: number;
  patchField: FieldOps["patchField"];
}

/** Longueur / taille communes + configuration des champs texte. */
export function FieldConfigBasics({ field, index: i, patchField }: Props) {
  return (
    <>
      <label className="flex min-h-7 items-center justify-between gap-2">
        <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">Taille</span>
        <select
          className="input h-7 w-36 px-2 py-0 text-xs"
          name={`champ-${field.id}-taille`}
          value={field.size ?? "md"}
          onChange={(e) =>
            patchField(i, (f) => ({
              ...f,
              size: e.target.value as "sm" | "md",
            }))
          }
        >
          <option value="sm">Petite</option>
          <option value="md">Normale</option>
        </select>
      </label>
      {field.kind === "text" && (
        <>
          <FieldInput
            label="Valeur par défaut"
            value={field.default ?? ""}
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "text" ? { ...f, default: v || undefined } : f))
            }
          />
          <FieldInput
            label="Caractères max"
            type="number"
            value={field.maxLength ?? ""}
            placeholder="5000"
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "text"
                  ? {
                      ...f,
                      maxLength:
                        v === "" || !Number.isFinite(Number(v))
                          ? undefined
                          : Math.max(1, Math.min(5_000, Math.round(Number(v)))),
                    }
                  : f,
              )
            }
          />
        </>
      )}
      {field.kind === "textarea" && (
        <>
          <FieldInput
            label="Valeur par défaut"
            value={field.default ?? ""}
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "textarea" ? { ...f, default: v || undefined } : f))
            }
          />
          <FieldInput
            label="Caractères max"
            type="number"
            value={field.maxLength ?? ""}
            placeholder="5000"
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "textarea"
                  ? {
                      ...f,
                      maxLength:
                        v === "" || !Number.isFinite(Number(v))
                          ? undefined
                          : Math.max(1, Math.min(5_000, Math.round(Number(v)))),
                    }
                  : f,
              )
            }
          />
        </>
      )}
    </>
  );
}
