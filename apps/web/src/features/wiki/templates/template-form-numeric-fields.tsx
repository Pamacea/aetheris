import type { FieldProps } from "./template-form-field";

/** Champs numériques : nombre (stepper), compteur, formule calculée. */

export function NumberField({ field, value, chrome, rt }: FieldProps<"number">) {
  const current =
    typeof value === "number" ? value : typeof field.default === "number" ? field.default : 0;
  const step = field.decimals ? Math.pow(10, -field.decimals) : 1;
  // Arrondi float : 0.1 + 0.2 ne doit pas afficher 0.30000000000000004.
  const round = (v: number) => (field.decimals ? Math.round(v * 1e6) / 1e6 : v);
  return (
    <label className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.labelRow}
      <div className="flex items-stretch">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={() =>
            rt.setValue(field.id, Math.max(field.min ?? -Infinity, round(current - step)))
          }
        >
          −
        </button>
        <input
          className={`input min-w-0 flex-1 border-x-0 text-center font-mono ${chrome.sizeCls}`}
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
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={() =>
            rt.setValue(field.id, Math.min(field.max ?? Infinity, round(current + step)))
          }
        >
          +
        </button>
        {field.unit && (
          <span className="flex items-center border border-border border-l-0 bg-background px-2 text-xs text-muted">
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
  return (
    <div className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.labelRow}
      <div className="flex items-stretch">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={() => rt.setValue(field.id, Math.max(0, current - step))}
        >
          −
        </button>
        <span
          className={`input min-w-12 flex-1 border-x-0 text-center font-mono ${chrome.sizeCls}`}
        >
          {current}
          {field.max !== undefined && <span className="text-muted"> / {field.max}</span>}
        </span>
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          onClick={() =>
            rt.setValue(
              field.id,
              field.max !== undefined ? Math.min(field.max, current + step) : current + step,
            )
          }
        >
          +
        </button>
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
    <div className={`flex flex-col gap-1 ${chrome.widthCls}`}>
      {chrome.labelRow}
      <p className="border border-border bg-background px-3 py-1.5 font-mono text-sm text-accent">
        {displayed}
        {field.unit ? ` ${field.unit}` : ""}
      </p>
      {chrome.rollFeedback}
      {chrome.help}
    </div>
  );
}
