"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { TemplateField } from "@aetheris/shared";
import { runSandbox } from "@/lib/sandbox";
import type { FieldOps } from "./builder-ops";
import type { JsTest } from "./builder-state";
import { buildFieldSuggestions, isListField } from "./builder-field-suggestions";
import { FieldInput } from "./builder-field-input";

interface Props {
  field: TemplateField;
  fields: TemplateField[];
  index: number;
  patchField: FieldOps["patchField"];
  jsTest: JsTest;
  setJsTest: Dispatch<SetStateAction<JsTest>>;
}

/** Expression de formule + insertion au curseur des identifiants du template. */
function FormulaExprInput({
  value,
  currentId,
  fields,
  onChange,
}: {
  value: string;
  currentId: string;
  fields: TemplateField[];
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState("");
  const [focused, setFocused] = useState(false);

  const trackToken = () => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const match = el.value.slice(0, caret).match(/[a-z0-9_-]*$/i);
    setToken(match?.[0].toLowerCase() ?? "");
  };

  const insert = useCallback(
    (id: string) => {
      const caret = ref.current?.selectionStart ?? value.length;
      const before = value.slice(0, caret);
      const start = before.length - (before.match(/[a-z0-9_-]*$/i)?.[0].length ?? 0);
      onChange(value.slice(0, start) + id + value.slice(caret));
      requestAnimationFrame(() => {
        const input = ref.current;
        if (!input) return;
        input.focus();
        input.setSelectionRange(start + id.length, start + id.length);
        setToken("");
      });
    },
    [value, onChange],
  );

  // Pendant la saisie, un clic sur une carte du canvas insère son identifiant au curseur.
  useEffect(() => {
    if (!focused) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (
        !target ||
        target.closest(
          'input, textarea, select, button, [contenteditable="true"], [data-field-config]',
        )
      )
        return;
      const id = target.closest("[data-field-id]")?.getAttribute("data-field-id");
      if (!id || id === currentId) return;
      e.preventDefault(); // garde le focus dans l'input
      e.stopPropagation(); // ne ferme pas le panneau de config ouvert (écouteur document)
      insert(id);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [focused, currentId, insert]);

  const suggestions = buildFieldSuggestions(fields, currentId, token);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex min-h-7 items-center justify-between gap-2">
        <span className="shrink-0 text-[0.6rem] tracking-widest text-muted uppercase">
          Expression
        </span>
        <input
          ref={ref}
          className="input h-7 w-44 min-w-0 px-2 py-0 font-mono text-xs"
          name="formule-expression"
          value={value}
          placeholder="force + mod"
          onChange={(e) => {
            onChange(e.target.value);
            trackToken();
          }}
          onClick={trackToken}
          onKeyUp={trackToken}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </label>
      <span className="text-[0.6rem] leading-tight text-muted">
        Cliquez un champ du canvas pour insérer son identifiant.
      </span>
      {suggestions.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              className="btn px-1.5 py-0.5 font-mono text-[0.65rem]"
              title={f.label}
              onMouseDown={(e) => {
                e.preventDefault(); // garde le curseur dans l'input
                insert(f.id);
              }}
            >
              {f.id}
            </button>
          ))}
        </span>
      )}
      {fields.some(isListField) && (
        <span className="text-[0.6rem] leading-tight text-muted">
          Somme d&apos;une colonne : inventaire_poids, inventaire_n (lignes).
        </span>
      )}
    </div>
  );
}

/** Configuration de la formule et du code JS (avec test en sandbox). */
export function FieldConfigCode({ field, fields, index: i, patchField, jsTest, setJsTest }: Props) {
  return (
    <>
      {field.kind === "formula" && (
        <>
          <FormulaExprInput
            value={field.expr}
            currentId={field.id}
            fields={fields}
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
