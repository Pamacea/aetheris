import type { FieldProps } from "./template-form-field";
import { ListCell } from "./template-form-list-cell";

/** Table éditable (lignes = tableaux d'objets) avec agrégats calculés. */

export function ListField({ field, value, chrome, rt }: FieldProps<"list">) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const setCell = (ri: number, colId: string, v: unknown) =>
    rt.setValue(
      field.id,
      rows.map((r, j) => (j === ri ? { ...r, [colId]: v } : r)),
    );
  const count = rt.numericScope[`${field.id}_n`] ?? 0;
  return (
    <div className={`flex flex-col gap-1 md:col-span-2 ${chrome.widthCls}`}>
      {chrome.label}
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {field.columns.map((c) => (
                <th
                  key={c.id}
                  className="px-2 py-1 text-left text-[0.6rem] tracking-widest text-muted uppercase"
                >
                  {c.label}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {field.columns.map((c) => (
                  <td key={c.id} className="px-1 py-1">
                    <ListCell
                      column={c}
                      cell={row[c.id]}
                      sizeCls={chrome.sizeCls}
                      notes={rt.notes}
                      categoryOf={rt.categoryOf}
                      onChange={(v) => setCell(ri, c.id, v)}
                    />
                  </td>
                ))}
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    className="btn px-1.5 py-0.5 text-xs text-destructive"
                    aria-label={`Supprimer la ligne ${ri + 1}`}
                    onClick={() =>
                      rt.setValue(
                        field.id,
                        rows.filter((_, j) => j !== ri),
                      )
                    }
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-2 py-2 text-xs text-muted" colSpan={field.columns.length + 1}>
                  Aucune ligne.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          disabled={rows.length >= 100}
          onClick={() => rt.setValue(field.id, [...rows, {}])}
        >
          + Ligne
        </button>
        {/* Agrégats calculés (buildFormulaScope) : mêmes clés que les formules. */}
        <span className="text-xs text-muted">
          {count} ligne{count > 1 ? "s" : ""}
          {field.columns
            .filter((c) => c.type === "number")
            .map((c) => {
              const sum = rt.numericScope[`${field.id}_${c.id}`] ?? 0;
              return (
                <span key={c.id} className="ml-3">
                  Σ {c.label} : {Math.round(sum * 100) / 100}
                </span>
              );
            })}
        </span>
      </div>
      {chrome.help}
    </div>
  );
}
