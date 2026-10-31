import type { TemplateField } from "@aetheris/shared";

export interface FieldSuggestion {
  id: string;
  label: string;
}

/** Types dont buildFormulaScope expose les agrégats `<champ>_n` / `<champ>_<col>`. */
export function isListField(
  field: TemplateField,
): field is Extract<TemplateField, { kind: "list" | "ability" | "inventory" }> {
  return field.kind === "list" || field.kind === "ability" || field.kind === "inventory";
}

/** Suggestions de l'éditeur de formule : ids des champs + agrégats des listes. */
export function buildFieldSuggestions(
  fields: TemplateField[],
  currentId: string,
  token: string,
): FieldSuggestion[] {
  if (!token) return [];
  const needle = token.toLowerCase();
  const seen = new Set<string>();
  const out: FieldSuggestion[] = [];
  const add = (id: string, label: string) => {
    if (seen.has(id) || !id.startsWith(needle)) return;
    seen.add(id);
    out.push({ id, label });
  };

  // Les ids de champs passent d'abord : en cas de collision avec un agrégat,
  // c'est leur libellé qui gagne.
  for (const field of fields) {
    if (field.id !== currentId) add(field.id, field.label);
  }
  for (const field of fields.filter(isListField)) {
    add(`${field.id}_n`, `${field.label} · lignes`);
    for (const col of field.columns) {
      if (col.type === "number") add(`${field.id}_${col.id}`, `${field.label} · ${col.label}`);
    }
  }
  return out.slice(0, 8);
}
