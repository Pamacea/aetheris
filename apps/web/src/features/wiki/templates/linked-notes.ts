import { templateSchemaSchema, type ListColumn, type TemplateField } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../types";

/** Fiche liée par une colonne `tag` : titre + modèle + valeurs résumées. */
export type LinkedNoteSummary = {
  title: string;
  templateName: string | null;
  summary: [string, string][];
};

/** Résumé enrichi des données de la fiche : icône et poids affichables en carte. */
export type LinkedNote = LinkedNoteSummary & {
  icon: string | null;
  weight: number | null;
};

const WEIGHT_RE = /poids|weight/i;

const MAX_SUMMARY = 6;
const MAX_VALUE = 40;

function truncate(value: string): string {
  return value.length > MAX_VALUE ? value.slice(0, MAX_VALUE) : value;
}

/** Ids des fiches référencées par une colonne `tag` des champs list/ability/inventory. */
export function collectLinkedNoteIds(schema: unknown, data: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const parsed = templateSchemaSchema.safeParse(schema);
  if (!parsed.success) return ids;
  for (const field of parsed.data.fields) {
    if (field.kind !== "list" && field.kind !== "ability" && field.kind !== "inventory") continue;
    const tagCols = field.columns.filter((c) => c.type === "tag");
    if (tagCols.length === 0) continue;
    const rows = data[field.id];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      for (const col of tagCols) {
        const value = (row as Record<string, unknown>)[col.id];
        if (typeof value === "string" && value.trim()) ids.add(value);
      }
    }
  }
  return ids;
}

/** Une paire libellé/valeur pour un champ scalaire non vide ; null sinon. */
function fieldPair(field: TemplateField, value: unknown): [string, string] | null {
  switch (field.kind) {
    case "text":
      return typeof value === "string" && value.trim()
        ? [field.label, truncate(value.trim())]
        : null;
    case "number":
    case "counter":
      return typeof value === "number" && Number.isFinite(value)
        ? [field.label, String(value)]
        : null;
    case "select":
      if (typeof value !== "string" || !value.trim()) return null;
      return [field.label, truncate(field.options.find((o) => o.value === value)?.label ?? value)];
    case "toggle":
      return typeof value === "boolean" ? [field.label, value ? "oui" : "—"] : null;
    default:
      return null;
  }
}

/** Résumé d'une fiche liée : au plus 6 champs scalaires non vides, dans l'ordre du modèle. */
export function summarizeLinkedNote(
  note: { title: string; type: string },
  template: WikiTemplateMeta | null,
  data: Record<string, unknown>,
): LinkedNoteSummary {
  const out: LinkedNoteSummary = {
    title: note.title,
    templateName: template?.name ?? null,
    summary: [],
  };
  const parsed = templateSchemaSchema.safeParse(template?.schema);
  if (!parsed.success) return out;
  for (const field of parsed.data.fields) {
    if (out.summary.length >= MAX_SUMMARY) break;
    const pair = fieldPair(field, data[field.id]);
    if (pair) out.summary.push(pair);
  }
  return out;
}

/** Icône (premier champ image non vide) et poids (premier nombre « poids/weight ») d'une fiche. */
export function linkedNoteVisuals(
  template: WikiTemplateMeta | null,
  data: Record<string, unknown>,
): { icon: string | null; weight: number | null } {
  const out: { icon: string | null; weight: number | null } = { icon: null, weight: null };
  const parsed = templateSchemaSchema.safeParse(template?.schema);
  if (!parsed.success) return out;
  for (const field of parsed.data.fields) {
    if (out.icon === null && field.kind === "image") {
      const value = data[field.id];
      if (typeof value === "string" && value.trim()) out.icon = value.trim();
    }
    if (
      out.weight === null &&
      field.kind === "number" &&
      (WEIGHT_RE.test(field.id) || WEIGHT_RE.test(field.label))
    ) {
      const value = data[field.id];
      if (typeof value === "number" && Number.isFinite(value)) out.weight = value;
    }
  }
  return out;
}

/** Fiche liée complète : résumé + icône/poids issus de ses données. */
export function linkedNote(
  note: { title: string; type: string },
  template: WikiTemplateMeta | null,
  data: Record<string, unknown>,
): LinkedNote {
  return { ...summarizeLinkedNote(note, template, data), ...linkedNoteVisuals(template, data) };
}

/**
 * Visuel d'une note : carte liée d'abord, puis métadonnées de la liste, sinon vide.
 * Chaque champ retombe séparément (icône connue sans poids, ou l'inverse).
 */
export function noteVisuals(
  id: string,
  linked: Record<string, Pick<LinkedNote, "icon" | "weight"> | undefined>,
  notes: readonly { id: string; icon?: string | null; weight?: number | null }[],
): { icon: string | null; weight: number | null } {
  const direct = linked[id];
  const meta = notes.find((n) => n.id === id);
  return {
    icon: direct?.icon ?? meta?.icon ?? null,
    weight: direct?.weight ?? meta?.weight ?? null,
  };
}

/** Colonnes de valeurs d'une carte : toutes sauf la colonne de lien vers la fiche. */
export function valueColumns(columns: ListColumn[], linkColId: string): ListColumn[] {
  return columns.filter((c) => c.id !== linkColId);
}

/** Colonne numérique conventionnelle (`quantite`, `poids`) ; null si absente ou d'un autre type. */
export function numberColumn(columns: ListColumn[], id: string): ListColumn | null {
  return columns.find((c) => c.id === id && c.type === "number") ?? null;
}

/** Pistes de grille communes à l'en-tête et aux valeurs des cartes. */
export function cardColumnTemplate(columns: ListColumn[]): string {
  return columns
    .map((c) => (c.type === "number" ? "4rem" : c.type === "toggle" ? "2rem" : "minmax(0,1fr)"))
    .join(" ");
}

/**
 * Largeur fixe partagée par l'en-tête et les cartes : même total donc mêmes
 * pistes `1fr`, et dépassement horizontal réel pour les chevrons.
 */
export function cardWidth(columns: ListColumn[]): number {
  const tracks = columns.reduce(
    (sum, c) => sum + (c.type === "number" ? 64 : c.type === "toggle" ? 32 : 96),
    0,
  );
  return tracks + Math.max(0, columns.length - 1) * 8; // gap-2
}
