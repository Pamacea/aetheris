import type { SelectOption } from "@aetheris/shared";

/** Éditeur d'options (label / valeur / couleur) partagé select, multiSelect et colonnes. */
export function OptionsEditor({
  options,
  onChange,
}: {
  options: SelectOption[];
  onChange: (next: SelectOption[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] tracking-widest text-muted uppercase">Options</span>
        <button
          type="button"
          className="btn px-2 py-0.5 text-xs text-accent"
          onClick={() =>
            onChange([
              ...options,
              {
                value: `option${options.length + 1}`,
                label: `Option ${options.length + 1}`,
              },
            ])
          }
        >
          + Option
        </button>
      </div>
      {options.map((o, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            className="input flex-1 py-0.5 text-xs"
            name={`option-${oi}-libelle`}
            value={o.label}
            placeholder="Libellé"
            onChange={(e) =>
              onChange(options.map((x, j) => (j === oi ? { ...x, label: e.target.value } : x)))
            }
          />
          <input
            className="input w-32 py-0.5 font-mono text-xs"
            name={`option-${oi}-valeur`}
            value={o.value}
            placeholder="valeur"
            onChange={(e) =>
              onChange(options.map((x, j) => (j === oi ? { ...x, value: e.target.value } : x)))
            }
          />
          <input
            type="color"
            name={`option-${oi}-couleur`}
            title="Couleur de l’option"
            className="h-6 w-8 shrink-0 cursor-pointer border border-border bg-background"
            value={o.color ?? "#e7dcc6"}
            onChange={(e) =>
              onChange(options.map((x, j) => (j === oi ? { ...x, color: e.target.value } : x)))
            }
          />
          <button
            type="button"
            className="btn px-2 py-0.5 text-xs text-destructive"
            disabled={options.length <= 1}
            onClick={() => onChange(options.filter((_, j) => j !== oi))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
