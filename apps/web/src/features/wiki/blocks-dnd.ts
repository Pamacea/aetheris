import type { Editor, JSONContent } from "@tiptap/core";
import { noteBlockKindSchema, type NoteBlock } from "@aetheris/shared";
import { DND_PRESETS } from "./extensions";
import { scopedContent } from "./blocks-scope";

/** MIME du drag « bloc » (palette ⇄ éditeur TipTap). */
export const BLOCK_MIME = "application/x-aetheris-block";

/** Nœud du document ciblé par un payload. */
export type BlockType = "dice" | "table" | "meta";

/** Payload glissé/cliqué depuis la palette (structure plate : jamais de nœud PM). */
export interface BlockDragPayload {
  type: BlockType;
  /** meta : kind du bloc de métadonnées. */
  kind?: NoteBlock["kind"];
  label?: string;
  value?: string;
  /** dice : expression du jet (ex. `1d20+3`). */
  expr?: string;
  /** Portée MJ : inséré dans un `<gm-secret>` (strippé pour les joueurs). */
  gm?: boolean;
}

/** Libellés des kinds de bloc de métadonnées. */
export const KIND_LABELS: Record<NoteBlock["kind"], string> = {
  date: "Date",
  event: "Événement",
  description: "Description",
  category: "Catégorie",
  custom: "Personnalisé",
  macro: "Macro",
};

/** Lecture defensive d'un payload JSON (dataTransfer corrompu → null, jamais de throw). */
export function parsePayload(raw: string | null | undefined): BlockDragPayload | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  if (o.type !== "dice" && o.type !== "table" && o.type !== "meta") return null;
  const out: BlockDragPayload = { type: o.type };
  if (typeof o.label === "string" && o.label.length > 0) out.label = o.label;
  if (typeof o.value === "string") out.value = o.value;
  if (typeof o.expr === "string" && o.expr.length > 0) out.expr = o.expr;
  if (o.gm === true) out.gm = true;
  if (o.type === "meta") {
    const kind = noteBlockKindSchema.safeParse(o.kind);
    if (!kind.success || !out.label) return null;
    out.kind = kind.data;
  }
  return out;
}

/** Payload d'un événement de drag (clipboard propriétaire de l'app). */
export function readPayload(e: React.DragEvent): BlockDragPayload | null {
  return parsePayload(e.dataTransfer.getData(BLOCK_MIME));
}

/** Contenu JSON du bloc (sans l'enveloppe éventuelle `<gm-secret>`). */
export function blockContentOf(p: BlockDragPayload): JSONContent {
  switch (p.type) {
    case "dice":
      return { type: "diceBlock", attrs: { label: p.label || "Jet", expr: p.expr || "1d20" } };
    case "table":
      return { type: "tableBlock" };
    case "meta":
      return {
        type: "metaBlock",
        attrs: {
          kind: p.kind ?? "custom",
          label: p.label ?? "",
          value: p.value ?? "",
        },
      };
  }
}

export interface BlockChip {
  key: string;
  title: string;
  hint: string;
  payload: BlockDragPayload;
}

/** Chips de la palette : blocs de base + presets « favoris » de campagne. */
export const PALETTE_CHIPS: BlockChip[] = [
  {
    key: "dice",
    title: "Jet de dés",
    hint: "dés · 1d20",
    payload: { type: "dice", label: "Jet", expr: "1d20" },
  },
  { key: "table", title: "Tableau", hint: "tableau", payload: { type: "table" } },
  {
    key: "valeur",
    title: "Valeur",
    hint: "valeur",
    payload: { type: "meta", kind: "custom", label: "Valeur", value: "" },
  },
  ...DND_PRESETS.flatMap((pack) =>
    pack.items.map<BlockChip>((it) => ({
      key: `${pack.pack}-${it.title}`,
      title: it.title,
      hint: pack.pack,
      payload: { type: "meta", kind: it.kind, label: it.label, value: "" },
    })),
  ),
];

/**
 * Insertion d'un bloc : au curseur (`pos` null) ou à la position de drop.
 * La portée MJ passe par `<gm-secret>` — même chemin que le menu slash.
 */
export function insertBlockAt(
  editor: Editor,
  payload: BlockDragPayload,
  pos: number | null,
): boolean {
  // Position numérique toujours : `insertContent` (sans At) remplace la
  // NodeSelection posée sur le bloc précédent au lieu d'insérer à côté.
  // Curseur après le bloc sélectionné pour enchaîner les insertions.
  const sel = editor.state.selection;
  const at = pos ?? (sel.empty ? sel.from : sel.to);
  const content = scopedContent(editor.state, blockContentOf(payload), payload.gm === true, at);
  return editor.chain().focus().insertContentAt(at, content).run();
}
