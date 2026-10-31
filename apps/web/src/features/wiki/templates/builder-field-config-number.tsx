import type { TemplateField } from "@aetheris/shared";
import type { FieldOps } from "./builder-ops";
import { FieldInput } from "./builder-field-input";

interface Props {
  field: TemplateField;
  index: number;
  patchField: FieldOps["patchField"];
}

/** Configuration du champ nombre (précision, bornes, jet). */
export function FieldConfigNumber({ field, index: i, patchField }: Props) {
  return (
    <>
      {field.kind === "number" && (
        <>
          <FieldInput
            label="Défaut"
            type="number"
            value={field.default ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "number"
                  ? {
                      ...f,
                      default: v === "" ? undefined : Number(v),
                    }
                  : f,
              )
            }
          />
          <FieldInput
            label="Unité"
            value={field.unit ?? ""}
            placeholder="m, kg…"
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "number" ? { ...f, unit: v || undefined } : f))
            }
          />
          {/* shortcut: précision fixée à 0/2 par le type — réintroduire un champ
          Décimales libre si besoin */}
          <label className="flex min-h-7 items-center justify-between gap-2">
            <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">
              Type de nombre
            </span>
            <select
              className="input h-7 w-40 min-w-0 px-2 py-0 text-xs"
              name={`champ-${field.id}-type-nombre`}
              value={
                field.decimals === 0
                  ? field.min === 0
                    ? "int+"
                    : "int±"
                  : field.min === 0
                    ? "float+"
                    : "float±"
              }
              onChange={(e) => {
                const v = e.target.value;
                patchField(i, (f) =>
                  f.kind === "number"
                    ? {
                        ...f,
                        ...(v === "int+"
                          ? { decimals: 0, min: 0 }
                          : v === "int±"
                            ? { decimals: 0, min: undefined }
                            : v === "float+"
                              ? { decimals: 2, min: 0 }
                              : { decimals: 2, min: undefined }),
                      }
                    : f,
                );
              }}
            >
              <option value="int+">Entier positif</option>
              <option value="int±">Entier signé</option>
              <option value="float+">Décimal positif</option>
              <option value="float±">Décimal signé</option>
            </select>
          </label>
          <FieldInput
            label="Expression de jet"
            value={field.roll ?? ""}
            placeholder="Ex. 1d20 + @mod"
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "number" ? { ...f, roll: v || undefined } : f))
            }
          />
          <FieldInput
            label="Min"
            type="number"
            value={field.min ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "number" ? { ...f, min: v === "" ? undefined : Number(v) } : f,
              )
            }
          />
          <FieldInput
            label="Max"
            type="number"
            value={field.max ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "number"
                  ? {
                      ...f,
                      max: v === "" ? undefined : Number(v),
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
