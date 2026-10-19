import type { NoteBlock } from "@aetheris/shared";

/** MIME du drag « bloc » (Bibliothèque ⇄ liste ⇄ éditeur TipTap). */
export const BLOCK_MIME = "application/x-aetheris-block";
/** `index` présent = reorder d'un bloc de la note ; absent = ajout depuis la bibliothèque. */
export type BlockDragPayload = {
  kind: NoteBlock["kind"];
  label: string;
  value: string;
  gm?: boolean;
  index?: number;
};

/** Libellé affiché des kinds de bloc (select « Type » + Bibliothèque). */
export const KIND_LABELS: Record<NoteBlock["kind"], string> = {
  date: "Date",
  event: "Événement",
  description: "Description",
  category: "Catégorie",
  custom: "Personnalisé",
  macro: "Macro",
};

/** Payload d'un bloc glissé : valeur affichée (macro → expr ou résultat). */
export function payloadOf(b: NoteBlock, index?: number): BlockDragPayload {
  const value = b.kind === "macro" ? b.value || b.expr || "" : b.value;
  return { kind: b.kind, label: b.label, value, gm: b.gm, index };
}

export function readPayload(e: React.DragEvent): BlockDragPayload | null {
  const raw = e.dataTransfer.getData(BLOCK_MIME);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as BlockDragPayload;
    return p?.kind && p.label ? p : null;
  } catch {
    return null;
  }
}

export function blockFromPayload(p: BlockDragPayload): NoteBlock {
  return {
    id: crypto.randomUUID(),
    kind: p.kind,
    label: p.label,
    value: p.value ?? "",
    ...(p.gm ? { gm: true } : {}),
  };
}
