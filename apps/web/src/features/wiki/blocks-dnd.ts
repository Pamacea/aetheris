import type { Editor, JSONContent } from "@tiptap/core";
import { noteBlockKindSchema, type NoteBlock } from "@aetheris/shared";
import { BLOCK_PAYLOAD_TYPES, type BlockDragPayload } from "./block-defs";
import { scopedContent } from "./blocks-scope";

export type { BlockDragPayload } from "./block-defs";

/** MIME du drag « bloc » (palette ⇄ éditeur TipTap). */
export const BLOCK_MIME = "application/x-aetheris-block";

/** Nœud du document ciblé par un payload. */
export type BlockType = BlockDragPayload["type"];

/** Libellés des kinds de bloc de métadonnées. */
export const KIND_LABELS: Record<NoteBlock["kind"], string> = {
  date: "Date",
  event: "Événement",
  description: "Description",
  category: "Catégorie",
  custom: "Personnalisé",
  macro: "Macro",
};

const PAYLOAD_TYPES = new Set<string>(BLOCK_PAYLOAD_TYPES);

/** Lecture défensive d'un payload JSON (dataTransfer corrompu → null, jamais de throw). */
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
  if (typeof o.type !== "string" || !PAYLOAD_TYPES.has(o.type)) return null;
  const out: BlockDragPayload = { type: o.type as BlockDragPayload["type"] };
  if (typeof o.label === "string" && o.label.length > 0) out.label = o.label;
  if (typeof o.value === "string") out.value = o.value;
  if (typeof o.expr === "string" && o.expr.length > 0) out.expr = o.expr;
  if (o.gm === true) out.gm = true;
  if (out.type === "heading") {
    if (o.level !== 1 && o.level !== 2 && o.level !== 3) return null;
    out.level = o.level;
  }
  if (out.type === "meta") {
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
    case "heading":
      return { type: "heading", attrs: { level: p.level ?? 1 } };
    case "paragraph":
      return { type: "paragraph" };
    case "blockquote":
      return { type: "blockquote", content: [{ type: "paragraph" }] };
    case "bulletList":
    case "orderedList":
      return {
        type: p.type,
        content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
      };
    case "horizontalRule":
      return { type: "horizontalRule" };
    case "gmSecret":
      return { type: "gmSecret", content: [{ type: "paragraph" }] };
  }
}

export interface InsertRange {
  from: number;
  to: number;
}

/**
 * Cible d'insertion : position de drop explicite, sinon la sélection courante
 * (non vide → remplacement), sinon la fin du document de façon déterministe.
 */
export function insertionTarget(
  pos: number | null,
  selection: InsertRange | null,
  docSize: number,
): InsertRange {
  if (pos !== null) return { from: pos, to: pos };
  if (selection) return selection;
  return { from: docSize, to: docSize };
}

/**
 * Insertion d'un bloc à la position de drop, à la sélection fournie, ou en fin
 * de document. La portée MJ passe par `<gm-secret>` — même chemin que le slash.
 */
export function insertBlockAt(
  editor: Editor,
  payload: BlockDragPayload,
  pos: number | null,
  selection: InsertRange | null = null,
): boolean {
  const target = insertionTarget(pos, selection, editor.state.doc.content.size);
  const gm = payload.gm === true && payload.type !== "gmSecret";
  const content = scopedContent(editor.state, blockContentOf(payload), gm, target.from);
  const inserted = editor.chain().focus().insertContentAt(target, content).run();
  if (!inserted) return false;
  // Replie la sélection après le bloc inséré : au clic suivant, on ajoute au
  // lieu de remplacer le NodeSelection laissé par l'insertion précédente.
  const $to = editor.state.selection.$to;
  editor.commands.setTextSelection($to.depth > 0 ? $to.after(1) : $to.pos);
  return true;
}
