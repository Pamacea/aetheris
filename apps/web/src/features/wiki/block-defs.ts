import type { NoteBlock } from "@aetheris/shared";

/** Sections éditoriales de la palette (l'ordre fait l'UI). */
export type BlockCategory = "text" | "sheet" | "gm" | "preset";

/** Types de nœud insérables par la palette et le menu slash. */
export const BLOCK_PAYLOAD_TYPES = [
  "heading",
  "paragraph",
  "blockquote",
  "bulletList",
  "orderedList",
  "horizontalRule",
  "meta",
  "dice",
  "table",
  "gmSecret",
] as const;

export type BlockPayloadType = (typeof BLOCK_PAYLOAD_TYPES)[number];

/** Payload JSON-sérialisable (drag HTML5, clic palette, presets slash). */
export interface BlockDragPayload {
  type: BlockPayloadType;
  /** meta : kind du bloc de métadonnées. */
  kind?: NoteBlock["kind"];
  label?: string;
  value?: string;
  /** dice : expression du jet (ex. `1d20+3`). */
  expr?: string;
  /** heading : niveau 1 à 3. */
  level?: 1 | 2 | 3;
  /** Portée MJ : inséré dans un `<gm-secret>` (strippé pour les joueurs). */
  gm?: boolean;
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
  payload: BlockDragPayload;
  /** Hint court du menu slash (repli : description). */
  hint?: string;
  /** Pack d'origine des presets de campagne. */
  pack?: string;
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
    hint: "•",
    payload: { type: "bulletList" },
  },
  {
    id: "ordered-list",
    label: "Liste numérotée",
    description: "Étapes ordonnées",
    category: "text",
    glyph: "1.",
    hint: "1.",
    payload: { type: "orderedList" },
  },
  {
    id: "horizontal-rule",
    label: "Filet",
    description: "Séparateur horizontal",
    category: "text",
    glyph: "—",
    hint: "---",
    payload: { type: "horizontalRule" },
  },
];

/** Blocs structurés de fiche JDR. */
export const SHEET_BLOCK_DEFS: BlockDef[] = [
  {
    id: "properties",
    label: "Propriétés clé-valeur",
    description: "Libellé + valeur (fiche personnage ou lieu)",
    category: "sheet",
    glyph: "clé",
    hint: "bloc · clé/valeur",
    payload: { type: "meta", kind: "custom", label: "Propriété", value: "" },
  },
  {
    id: "dice",
    label: "Jet de dés",
    description: "Lancer un dé (ex. 1d20+3)",
    category: "sheet",
    glyph: "d20",
    hint: "bloc · 1d20",
    payload: { type: "dice" },
  },
  {
    id: "table",
    label: "Tableau",
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

export interface BlockPresetPack {
  pack: string;
  items: { title: string; kind: NoteBlock["kind"]; label: string }[];
}

/** Presets de campagne (source unique : palette, slash, Bibliothèque de blocs). */
export const BLOCK_PRESETS: BlockPresetPack[] = [
  {
    pack: "générique",
    items: [
      { title: "Date", kind: "date", label: "Date" },
      { title: "Événement", kind: "event", label: "Événement" },
      { title: "Description", kind: "description", label: "Description" },
      { title: "Catégorie", kind: "category", label: "Catégorie" },
      { title: "Personnalisé", kind: "custom", label: "Personnalisé" },
      { title: "Histoire", kind: "description", label: "Histoire" },
      { title: "Macro", kind: "macro", label: "Macro" },
    ],
  },
  {
    pack: "SF",
    items: [
      { title: "Ère", kind: "custom", label: "Ère" },
      { title: "Colonie", kind: "category", label: "Colonie" },
      { title: "Navire", kind: "custom", label: "Navire" },
    ],
  },
  {
    pack: "Médiéval fantasy",
    items: [
      { title: "Ère", kind: "custom", label: "Ère" },
      { title: "Royaume", kind: "category", label: "Royaume" },
      { title: "Quête", kind: "event", label: "Quête" },
    ],
  },
  {
    pack: "Horreur",
    items: [
      { title: "Menace", kind: "event", label: "Menace" },
      { title: "Sanction", kind: "custom", label: "Sanction" },
      { title: "Witness", kind: "description", label: "Witness" },
    ],
  },
];

/** Presets exposés au drag & drop (palette) : pack générique seul. */
export const DND_PRESETS = BLOCK_PRESETS.filter((p) => p.pack === "générique");

function presetDef(pack: string, item: BlockPresetPack["items"][number]): BlockDef {
  return {
    id: `preset:${pack}:${item.title}`,
    label: item.title,
    description: `Favori ${pack} · ${item.label}`,
    category: "preset",
    glyph: "◆",
    hint: `bloc · ${pack}`,
    pack,
    payload: { type: "meta", kind: item.kind, label: item.label, value: "" },
  };
}

/** Tous les presets, toutes extensions confondues (menu slash). */
export const PRESET_BLOCK_DEFS: BlockDef[] = BLOCK_PRESETS.flatMap((p) =>
  p.items.map((item) => presetDef(p.pack, item)),
);

/** Liste unique consommée par le menu slash. */
export const BLOCK_DEFS: BlockDef[] = [
  ...TEXT_BLOCK_DEFS,
  ...SHEET_BLOCK_DEFS,
  ...GM_BLOCK_DEFS,
  ...PRESET_BLOCK_DEFS,
];

/** Palette groupée : les presets génériques restent accessibles en favoris. */
export const PALETTE_SECTIONS: { id: BlockCategory; label: string; blocks: BlockDef[] }[] = [
  { id: "text", label: "Texte", blocks: TEXT_BLOCK_DEFS },
  { id: "sheet", label: "Fiche JDR", blocks: SHEET_BLOCK_DEFS },
  { id: "gm", label: "MJ", blocks: GM_BLOCK_DEFS },
  {
    id: "preset",
    label: "Favoris de campagne",
    blocks: PRESET_BLOCK_DEFS.filter((d) => d.pack === "générique"),
  },
];
