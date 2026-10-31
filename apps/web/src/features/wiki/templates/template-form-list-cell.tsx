import type { ListColumn } from "@aetheris/shared";
import { evaluateFormula } from "@/lib/formula";
import type { WikiNoteMeta } from "../types";

/** Éditeur d'une cellule de liste (texte / nombre / select / tag-notes / toggle / formule). */
export function ListCell({
  column,
  cell,
  sizeCls,
  notes,
  categoryOf,
  numericScope,
  rowScope,
  onNavigate,
  onChange,
}: {
  column: ListColumn;
  cell: unknown;
  sizeCls: string;
  notes: WikiNoteMeta[];
  categoryOf: (n: WikiNoteMeta) => string | null;
  numericScope: Record<string, number>;
  rowScope: Record<string, number>;
  onNavigate: (noteId: string) => void;
  onChange: (v: unknown) => void;
}) {
  if (column.type === "tag") {
    const id = typeof cell === "string" ? cell : "";
    const note = id ? notes.find((n) => n.id === id) : undefined;
    if (note) {
      return (
        <span className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            title={note.title}
            className="min-w-0 truncate text-xs text-accent hover:underline"
            onClick={() => onNavigate(note.id)}
          >
            {note.title}
          </button>
          <button
            type="button"
            aria-label={`Retirer ${note.title}`}
            className="shrink-0 text-xs text-destructive"
            onClick={() => onChange(null)}
          >
            ✕
          </button>
        </span>
      );
    }
    return (
      <select
        name={`colonne-${column.id}`}
        className={`input w-full ${sizeCls}`}
        value={id}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">—</option>
        {notes
          .filter((n) => !column.targetCategory || categoryOf(n) === column.targetCategory)
          .map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
      </select>
    );
  }
  return column.type === "toggle" ? (
    <input
      type="checkbox"
      className="h-4 w-4 accent-[var(--accent)]"
      name={`colonne-${column.id}`}
      aria-label={`${column.label} (${column.id})`}
      checked={cell === true}
      onChange={(e) => onChange(e.target.checked)}
    />
  ) : column.type === "formula" ? (
    <span className="flex items-center gap-1">
      <input
        name={`colonne-${column.id}`}
        className={`input w-full ${sizeCls}`}
        placeholder="force + 2"
        value={typeof cell === "string" ? cell : ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
      <span className="shrink-0 font-mono text-xs text-accent" title="Résultat de la formule">
        {typeof cell === "string" && cell.trim()
          ? (evaluateFormula(cell, { ...numericScope, ...rowScope }) ?? "—")
          : "—"}
      </span>
    </span>
  ) : column.type === "number" ? (
    <input
      type="number"
      name={`colonne-${column.id}`}
      className={`input w-full ${sizeCls}`}
      value={typeof cell === "number" ? cell : ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  ) : column.type === "select" ? (
    <select
      name={`colonne-${column.id}`}
      className={`input w-full ${sizeCls}`}
      value={typeof cell === "string" ? cell : ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">—</option>
      {(column.options ?? []).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ) : (
    <input
      name={`colonne-${column.id}`}
      className={`input w-full ${sizeCls}`}
      value={typeof cell === "string" ? cell : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
