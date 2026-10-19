import type { TemplateField } from "@aetheris/shared";
import type { FieldOps } from "./builder-ops";
import { FieldInput } from "./builder-field-input";

interface Props {
  field: TemplateField;
  index: number;
  patchField: FieldOps["patchField"];
}

/** Configuration du compteur, de l'image et du CSS par défaut. */
export function FieldConfigExtra({ field, index: i, patchField }: Props) {
  return (
    <>
      {field.kind === "counter" && (
        <>
          <FieldInput
            label="Défaut"
            type="number"
            value={field.default ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "counter"
                  ? {
                      ...f,
                      default: v === "" ? undefined : Number(v),
                    }
                  : f,
              )
            }
          />
          <FieldInput
            label="Max"
            type="number"
            value={field.max ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "counter"
                  ? {
                      ...f,
                      max: v === "" ? undefined : Number(v),
                    }
                  : f,
              )
            }
          />
          <FieldInput
            label="Étape"
            type="number"
            value={field.step ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "counter" ? { ...f, step: v === "" ? undefined : Number(v) } : f,
              )
            }
          />
          <FieldInput
            label="Expression de jet"
            value={field.roll ?? ""}
            placeholder="Ex. 1d20 + @mod"
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "counter" ? { ...f, roll: v || undefined } : f))
            }
          />
        </>
      )}
      {field.kind === "image" && (
        <>
          <FieldInput
            label="URL par défaut"
            value={field.default ?? ""}
            placeholder="https://…"
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "image" ? { ...f, default: v || undefined } : f))
            }
          />
          <FieldInput
            label="Hauteur max (px)"
            type="number"
            value={field.height ?? ""}
            placeholder="192"
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "image"
                  ? {
                      ...f,
                      height:
                        v === "" || !Number.isFinite(Number(v))
                          ? undefined
                          : Math.max(16, Math.min(2000, Math.round(Number(v)))),
                    }
                  : f,
              )
            }
          />
        </>
      )}
      {field.kind === "css" && (
        <label className="flex w-full flex-col gap-0.5">
          <span className="text-[0.6rem] tracking-widest text-muted uppercase">CSS par défaut</span>
          <textarea
            className="input min-h-16 w-full resize-y py-1 font-mono text-xs"
            name={`champ-${field.id}-css`}
            spellCheck={false}
            value={field.default ?? ""}
            placeholder="Ex. .template-form { border: 1px solid crimson; }"
            onChange={(e) =>
              patchField(i, (f) =>
                f.kind === "css" ? { ...f, default: e.target.value || undefined } : f,
              )
            }
          />
        </label>
      )}
    </>
  );
}
