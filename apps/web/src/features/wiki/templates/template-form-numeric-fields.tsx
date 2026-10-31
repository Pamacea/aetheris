import type { FieldProps } from "./template-form-field";

/** Champs numériques : nombre (stepper), compteur, formule calculée. */

export function NumberField({ field, value, chrome, rt }: FieldProps<"number">) {
  const current =
    typeof value === "number" ? value : typeof field.default === "number" ? field.default : 0;
  const step = field.decimals ? Math.pow(10, -field.decimals) : 1;
  // Arrondi float : 0.1 + 0.2 ne doit pas afficher 0.30000000000000004.
  const round = (v: number) => (field.decimals ? Math.round(v * 1e6) / 1e6 : v);
  // Chevrons intégrés à droite de l'input : aucun bouton latéral, gain de largeur.
  const decrement = () =>
    rt.setValue(field.id, Math.max(field.min ?? -Infinity, round(current - step)));
  const increment = () =>
    rt.setValue(field.id, Math.min(field.max ?? Infinity, round(current + step)));
  return (
    <label className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.labelRow}
      <div className="flex min-h-0 flex-1 items-stretch">
        <div className="relative min-w-0 flex-1">
          <input
            className={`input h-full w-full text-center font-mono ${chrome.sizeCls}`}
            name={field.id}
            type="number"
            inputMode="decimal"
            step={field.decimals ? Math.pow(10, -field.decimals) : "any"}
            min={field.min}
            max={field.max}
            value={typeof value === "number" ? value : ""}
            onChange={(e) =>
              rt.setValue(field.id, e.target.value === "" ? null : Number(e.target.value))
            }
          />
          {/* Zones invisibles au repos, chevron révélé au survol (bande droite). */}
          <button
            type="button"
            className="absolute inset-x-0 top-0 flex h-1/2 items-center justify-center bg-transparent text-[0.5rem] leading-none text-muted opacity-0 hover:opacity-100 focus-visible:opacity-100"
            aria-label="Augmenter"
            onClick={increment}
          >
            ▲
          </button>
          <button
            type="button"
            className="absolute inset-x-0 bottom-0 flex h-1/2 items-center justify-center bg-transparent text-[0.5rem] leading-none text-muted opacity-0 hover:opacity-100 focus-visible:opacity-100"
            aria-label="Diminuer"
            onClick={decrement}
          >
            ▼
          </button>
        </div>
        {field.unit && (
          <span className="flex shrink-0 items-center border border-border border-l-0 bg-background px-2 text-xs text-muted">
            {field.unit}
          </span>
        )}
      </div>
      {chrome.rollFeedback}
      {chrome.help}
    </label>
  );
}

export function CounterField({ field, value, chrome, rt }: FieldProps<"counter">) {
  const step = field.step ?? 1;
  const current = typeof value === "number" ? value : 0;
  const clamp = (n: number) => Math.min(field.max ?? Infinity, Math.max(0, n));
  // Chevrons intégrés à droite du compteur : aucun bouton latéral.
  const decrement = () => rt.setValue(field.id, Math.max(0, current - step));
  const increment = () =>
    rt.setValue(
      field.id,
      field.max !== undefined ? Math.min(field.max, current + step) : current + step,
    );
  return (
    <div className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.labelRow}
      <div className="flex min-h-0 flex-1 items-stretch">
        <div className="relative min-w-0 flex-1">
          <input
            className={`input h-full w-full text-center font-mono ${chrome.sizeCls}`}
            name={field.id}
            type="number"
            inputMode="numeric"
            min={0}
            max={field.max}
            step={step}
            value={typeof value === "number" ? value : ""}
            onChange={(e) =>
              rt.setValue(field.id, e.target.value === "" ? null : Number(e.target.value))
            }
            onBlur={(e) => {
              const n = Number(e.target.value);
              const next = e.target.value === "" || !Number.isFinite(n) ? 0 : clamp(n);
              if (next !== current) rt.setValue(field.id, next);
            }}
          />
          {/* Zones invisibles au repos, chevron révélé au survol (bande droite). */}
          <button
            type="button"
            className="absolute inset-x-0 top-0 flex h-1/2 items-center justify-center bg-transparent text-[0.5rem] leading-none text-muted opacity-0 hover:opacity-100 focus-visible:opacity-100"
            aria-label="Augmenter"
            onClick={increment}
          >
            ▲
          </button>
          <button
            type="button"
            className="absolute inset-x-0 bottom-0 flex h-1/2 items-center justify-center bg-transparent text-[0.5rem] leading-none text-muted opacity-0 hover:opacity-100 focus-visible:opacity-100"
            aria-label="Diminuer"
            onClick={decrement}
          >
            ▼
          </button>
        </div>
        {field.max !== undefined && (
          <span className="flex shrink-0 items-center px-1 text-xs text-muted">/ {field.max}</span>
        )}
      </div>
      {chrome.rollFeedback}
      {chrome.help}
    </div>
  );
}

export function FormulaField({ field, chrome, rt }: FieldProps<"formula">) {
  const v = rt.numericScope[field.id];
  const displayed =
    v === undefined
      ? "—"
      : field.decimals !== undefined
        ? v.toFixed(field.decimals)
        : Math.round(v * 100) / 100;
  return (
    <div className={`flex h-full min-h-0 flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.labelRow}
      <p className="flex min-h-0 flex-1 items-center border border-border bg-background px-3 py-1.5 font-mono text-sm text-accent">
        {displayed}
        {field.unit ? ` ${field.unit}` : ""}
      </p>
      {chrome.rollFeedback}
      {chrome.help}
    </div>
  );
}
