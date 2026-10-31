import type { JSONContent } from "@tiptap/core";

/** Sections éditoriales de la palette (l'ordre fait l'UI). */
export type BlockCategory = "text" | "sheet" | "gm";

/** Types de nœud insérables par la palette et le menu slash. */
export const BLOCK_PAYLOAD_TYPES = [
  "heading",
  "paragraph",
  "blockquote",
  "bulletList",
  "dice",
  "table",
  "gmSecret",
] as const;

export type BlockPayloadType = (typeof BLOCK_PAYLOAD_TYPES)[number];

/** Bloc à insérer, dans le flux du document. */
export interface BlockPayload {
  type: BlockPayloadType;
  /** heading : niveau 1 à 3. */
  level?: 1 | 2 | 3;
  /** dice : libellé affiché. */
  label?: string;
  /** dice : expression du jet (ex. `1d20+3`). */
  expr?: string;
}

/** Définition unique d'un bloc : consommée par la palette et le menu slash. */
export interface BlockDef {
  /** Identifiant stable (clé React, tests). */
  id: string;
  label: string;
  description: string;
  category: BlockCategory;
  /** Glyphe décoratif (aucune librairie d'icônes). */
  glyph: string;
  payload: BlockPayload;
  /** Hint court du menu slash (repli : description). */
  hint?: string;
}

/** Blocs de texte natifs (StarterKit). */
export const TEXT_BLOCK_DEFS: BlockDef[] = [
  {
    id: "heading-1",
    label: "Titre 1",
    description: "Grand titre de section",
    category: "text",
    glyph: "H1",
    hint: "h1",
    payload: { type: "heading", level: 1 },
  },
  {
    id: "heading-2",
    label: "Titre 2",
    description: "Titre de sous-section",
    category: "text",
    glyph: "H2",
    hint: "h2",
    payload: { type: "heading", level: 2 },
  },
  {
    id: "heading-3",
    label: "Titre 3",
    description: "Titre de détail",
    category: "text",
    glyph: "H3",
    hint: "h3",
    payload: { type: "heading", level: 3 },
  },
  {
    id: "paragraph",
    label: "Paragraphe",
    description: "Texte courant",
    category: "text",
    glyph: "¶",
    hint: "paragraphe · texte",
    payload: { type: "paragraph" },
  },
  {
    id: "blockquote",
    label: "Citation",
    description: "Passage cité, en retrait",
    category: "text",
    glyph: "❝",
    hint: ">",
    payload: { type: "blockquote" },
  },
  {
    id: "bullet-list",
    label: "Liste à puces",
    description: "Points non ordonnés",
    category: "text",
    glyph: "•",
    hint: "• · puces",
    payload: { type: "bulletList" },
  },
];

/** Éléments JDR : blocs atomiques rendus par des vues React. */
export const SHEET_BLOCK_DEFS: BlockDef[] = [
  {
    id: "dice",
    label: "Jet de dés",
    description: "Dé cliquable (ex. 1d20+3)",
    category: "sheet",
    glyph: "d20",
    hint: "bloc · 1d20",
    payload: { type: "dice", label: "Jet", expr: "1d20" },
  },
  {
    id: "table",
    label: "Tableau de stats",
    description: "Grille de données éditable",
    category: "sheet",
    glyph: "▦",
    hint: "bloc · tableau",
    payload: { type: "table" },
  },
];

/** Blocs réservés au MJ. */
export const GM_BLOCK_DEFS: BlockDef[] = [
  {
    id: "gm-secret",
    label: "Bloc secret MJ",
    description: "Visible uniquement par le MJ",
    category: "gm",
    glyph: "MJ",
    hint: "visible uniquement par les MJ",
    payload: { type: "gmSecret" },
  },
];

/** Liste unique consommée par le menu slash. */
export const BLOCK_DEFS: BlockDef[] = [...TEXT_BLOCK_DEFS, ...SHEET_BLOCK_DEFS, ...GM_BLOCK_DEFS];

/** Palette groupée (même source que le menu slash). */
export const PALETTE_SECTIONS: { id: BlockCategory; label: string; blocks: BlockDef[] }[] = [
  { id: "text", label: "Texte", blocks: TEXT_BLOCK_DEFS },
  { id: "sheet", label: "Éléments JDR", blocks: SHEET_BLOCK_DEFS },
  { id: "gm", label: "MJ", blocks: GM_BLOCK_DEFS },
];

/** Contenu JSON d'un bloc inséré dans le flux du document. */
export function blockContentOf(p: BlockPayload): JSONContent {
  switch (p.type) {
    case "dice":
      return { type: "diceBlock", attrs: { label: p.label || "Jet", expr: p.expr || "1d20" } };
    case "table":
      return { type: "tableBlock" };
    case "gmSecret":
      return { type: "gmSecret", content: [{ type: "paragraph" }] };
    case "heading":
      return { type: "heading", attrs: { level: p.level ?? 1 } };
    case "paragraph":
      return { type: "paragraph" };
    case "blockquote":
      return { type: "blockquote", content: [{ type: "paragraph" }] };
    case "bulletList":
      return {
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
      };
  }
}
