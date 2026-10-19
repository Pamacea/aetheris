import { templateSchemaSchema, type TemplateField, type TemplateFieldKind } from "@aetheris/shared";
import type { WikiTemplateMeta } from "../wiki-app";

export const KIND_LABELS: Record<TemplateFieldKind, string> = {
  text: "Texte court",
  textarea: "Texte long",
  number: "Nombre",
  counter: "Compteur",
  select: "Liste",
  multiSelect: "Choix multiples",
  list: "Liste répétable",
  toggle: "Interrupteur",
  tag: "Lien wiki",
  image: "Image",
  formula: "Formule",
  css: "CSS",
  js: "Code JS",
};

/**
 * Palette de champs à glisser (inspirée d'Amsel Suite et Foundry VTT).
 * Chaque entrée produit un champ pré-configuré ; « entier » et « décimal »
 * sont des variantes du nombre (decimals 0 / 2).
 */
export interface PaletteItem {
  key: string;
  label: string;
  hint: string;
  make: (id: string) => TemplateField;
}

export function makeField(kind: TemplateFieldKind, id: string, label: string): TemplateField {
  switch (kind) {
    case "text":
      return { id, label, kind: "text" };
    case "textarea":
      return { id, label, kind: "textarea" };
    case "number":
      return { id, label, kind: "number" };
    case "counter":
      return { id, label, kind: "counter" };
    case "select":
      return {
        id,
        label,
        kind: "select",
        options: [{ value: "option1", label: "Option 1" }],
      };
    case "multiSelect":
      return {
        id,
        label,
        kind: "multiSelect",
        options: [{ value: "option1", label: "Option 1" }],
      };
    case "list":
      return {
        id,
        label,
        kind: "list",
        columns: [{ id: "colonne1", label: "Colonne", type: "text" }],
      };
    case "toggle":
      return { id, label, kind: "toggle" };
    case "tag":
      return { id, label, kind: "tag" };
    case "image":
      return { id, label, kind: "image" };
    case "formula":
      return { id, label, kind: "formula", expr: "1" };
    case "css":
      return { id, label, kind: "css" };
    case "js":
      return { id, label, kind: "js" };
  }
}

export function parseFields(t: WikiTemplateMeta): TemplateField[] {
  const parsed = templateSchemaSchema.safeParse(t.schema);
  if (parsed.success) return parsed.data.fields;
  // Tolérance d'édition : un champ invalide (ex. libellé vidé pendant la
  // saisie) ne doit pas vider tout l'éditeur — on affiche ce qui est
  // structurellement correct et handleSave validera avant envoi.
  const raw = (t.schema as { fields?: unknown } | null)?.fields;
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is TemplateField => {
    if (!f || typeof f !== "object") return false;
    const kind = (f as { kind?: unknown }).kind;
    return (
      typeof kind === "string" &&
      kind in KIND_LABELS &&
      typeof (f as { id?: unknown }).id === "string"
    );
  });
}
