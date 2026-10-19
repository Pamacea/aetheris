import type { ListColumn } from "@aetheris/shared";
import type { WikiNoteMeta } from "../types";

/** Éditeur d'une cellule de liste (texte / nombre / select / tag-notes). */
export function ListCell({
  column,
  cell,
  sizeCls,
  notes,
  categoryOf,
  onChange,
}: {
  column: ListColumn;
  cell: unknown;
  sizeCls: string;
  notes: WikiNoteMeta[];
  categoryOf: (n: WikiNoteMeta) => string | null;
  onChange: (v: unknown) => void;
}) {
  return column.type === "number" ? (
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
  ) : column.type === "tag" ? (
    <select
      name={`colonne-${column.id}`}
      className={`input w-full ${sizeCls}`}
      value={typeof cell === "string" ? cell : ""}
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
  ) : (
    <input
      name={`colonne-${column.id}`}
      className={`input w-full ${sizeCls}`}
      value={typeof cell === "string" ? cell : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
