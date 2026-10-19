import { findParentNodeClosestToPos, type Editor, type JSONContent } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";

/** Nœuds de bloc manipulables par la palette (synchronisé avec extensions.ts). */
const BLOCK_NODES = new Set(["metaBlock", "diceBlock", "tableBlock"]);

/** La position est déjà à l'intérieur d'un `<gm-secret>` (parent ou ancêtre). */
export function isInsideGmSecret(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === "gmSecret") return true;
  }
  return false;
}

/** `pos` pointe sur un bloc de palette enveloppé dans un secret MJ. */
export function isBlockInGmSecret(state: EditorState, pos: number): boolean {
  const block = state.doc.resolve(pos).nodeAfter;
  return !!block && BLOCK_NODES.has(block.type.name) && isInsideGmSecret(state, pos);
}

/**
 * Contenu à insérer en `at` : portée MJ → enveloppé dans `<gm-secret>`, le
 * même filtre que `stripGmSecrets()` (lecture joueur + page publique).
 * shortcut: en dessous d'un secret existant, la portée MJ est déjà active.
 */
export function scopedContent(
  state: EditorState,
  content: JSONContent,
  gm: boolean,
  at: number,
): JSONContent {
  if (!gm || isInsideGmSecret(state, at)) return content;
  return { type: "gmSecret", content: [content, { type: "paragraph" }] };
}

/** Enveloppe le bloc désigné par `pos` — null si ce n'est pas un bloc ou s'il est déjà secret. */
export function wrapBlockInSecret(state: EditorState, pos: number): Transaction | null {
  const block = state.doc.resolve(pos).nodeAfter;
  if (!block || !BLOCK_NODES.has(block.type.name) || isInsideGmSecret(state, pos)) return null;
  const secret = state.schema.nodes.gmSecret?.create(null, [
    block,
    state.schema.nodes.paragraph.create(),
  ]);
  if (!secret) return null;
  // nodeSize (et non size) : les nœuds de bloc sont des feuilles.
  return state.tr.replaceWith(pos, pos + block.nodeSize, secret);
}

/** Sort le bloc de son secret : le `<gm-secret>` est dissous, son contenu remonté tel quel. */
export function unwrapBlockFromSecret(state: EditorState, pos: number): Transaction | null {
  const $pos = state.doc.resolve(pos);
  const block = $pos.nodeAfter;
  if (!block || !BLOCK_NODES.has(block.type.name)) return null;
  const secret = findParentNodeClosestToPos($pos, (n) => n.type.name === "gmSecret");
  if (!secret) return null;
  return state.tr.replaceWith(secret.pos, secret.pos + secret.node.nodeSize, secret.node.content);
}

/** Case « MJ » des vues de blocs : applique le changement de portée, true si appliqué. */
export function setBlockGmScope(editor: Editor, pos: number | undefined, gm: boolean): boolean {
  if (pos === undefined) return false;
  const tr = gm ? wrapBlockInSecret(editor.state, pos) : unwrapBlockFromSecret(editor.state, pos);
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
}
