import type { Dispatch, SetStateAction } from "react";
import type { TemplateField } from "@aetheris/shared";
import { runSandbox } from "@/lib/sandbox";
import type { FieldOps } from "./builder-ops";
import type { JsTest } from "./builder-state";
import { FieldInput } from "./builder-field-input";

interface Props {
  field: TemplateField;
  index: number;
  patchField: FieldOps["patchField"];
  jsTest: JsTest;
  setJsTest: Dispatch<SetStateAction<JsTest>>;
}

/** Configuration de la formule et du code JS (avec test en sandbox). */
export function FieldConfigCode({ field, index: i, patchField, jsTest, setJsTest }: Props) {
  return (
    <>
      {field.kind === "formula" && (
        <>
          <FieldInput
            label="Expression"
            value={field.expr}
            placeholder="force + mod"
            mono
            onChange={(v) => patchField(i, (f) => (f.kind === "formula" ? { ...f, expr: v } : f))}
          />
          <FieldInput
            label="Décimales"
            type="number"
            value={field.decimals ?? ""}
            onChange={(v) =>
              patchField(i, (f) =>
                f.kind === "formula"
                  ? {
                      ...f,
                      decimals: v === "" ? undefined : Math.max(0, Math.min(4, Number(v))),
                    }
                  : f,
              )
            }
          />
          <FieldInput
            label="Unité"
            value={field.unit ?? ""}
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "formula" ? { ...f, unit: v || undefined } : f))
            }
          />
          <FieldInput
            label="Expression de jet"
            value={field.roll ?? ""}
            placeholder="Ex. 1d20 + @mod"
            onChange={(v) =>
              patchField(i, (f) => (f.kind === "formula" ? { ...f, roll: v || undefined } : f))
            }
          />
        </>
      )}
      {field.kind === "js" && (
        <div className="flex w-full flex-wrap items-end gap-2">
          <label className="flex min-w-64 flex-1 flex-col gap-0.5">
            <span className="text-[0.6rem] tracking-widest text-muted uppercase">
              Code JS par défaut
            </span>
            <textarea
              className="input min-h-16 w-full resize-y py-1 font-mono text-xs"
              name={`champ-${field.id}-code`}
              spellCheck={false}
              value={field.default ?? ""}
              placeholder="Ex. return `Niveau ${niveau}`;"
              onChange={(e) =>
                patchField(i, (f) =>
                  f.kind === "js" ? { ...f, default: e.target.value || undefined } : f,
                )
              }
            />
          </label>
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            disabled={
              !field.default?.trim() ||
              (jsTest?.id === field.id && jsTest.result === undefined && jsTest.error === undefined)
            }
            onClick={() => {
              const id = field.id;
              setJsTest({ id });
              runSandbox(field.default ?? "", {
                title: "Test de champ JS (sandbox)",
              })
                .then((r) => setJsTest({ id, result: r }))
                .catch((e) =>
                  setJsTest({
                    id,
                    error: e instanceof Error ? e.message : String(e),
                  }),
                );
            }}
          >
            Tester
          </button>
          {jsTest?.id === field.id &&
            (jsTest.result !== undefined ? (
              <p className="w-full border border-accent/40 bg-accent/10 px-2 py-1 font-mono text-xs text-accent">
                {jsTest.result}
              </p>
            ) : jsTest.error !== undefined ? (
              <p className="w-full text-xs text-destructive">{jsTest.error}</p>
            ) : (
              <span className="text-xs text-muted">Exécution…</span>
            ))}
        </div>
      )}
    </>
  );
}
