import { findParentNodeClosestToPos, type Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

/** Nœuds de bloc manipulables par la palette (synchronisé avec extensions.ts). */
const BLOCK_NODES = new Set(["diceBlock", "tableBlock"]);

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

/** Un secret est « vidé » : plus rien, ou seulement des paragraphes vides. */
function isVacuousSecret(node: Node): boolean {
  if (node.childCount === 0) return true;
  let vacuous = true;
  node.content.forEach((child) => {
    if (child.type.name !== "paragraph" || child.childCount > 0) vacuous = false;
  });
  return vacuous;
}

/**
 * Suppression d'un bloc : si son enveloppe `<gm-secret>` ne garde plus que du
 * vide, elle part avec (pas de container MJ orphelin). Inversement, le toggle
 * MJ ne supprime jamais le bloc (wrap/unwrap ci-dessus).
 */
export function deleteBlockAt(state: EditorState, pos: number): Transaction | null {
  const $pos = state.doc.resolve(pos);
  const block = $pos.nodeAfter;
  if (!block || !BLOCK_NODES.has(block.type.name)) return null;
  const secret = findParentNodeClosestToPos($pos, (n) => n.type.name === "gmSecret");
  const tr = state.tr.delete(pos, pos + block.nodeSize);
  if (!secret) return tr;
  // La suppression est postérieure au début du secret : sa position est stable.
  const after = tr.doc.nodeAt(secret.pos);
  if (after && after.type.name === "gmSecret" && isVacuousSecret(after)) {
    tr.delete(secret.pos, secret.pos + after.nodeSize);
  }
  return tr;
}

/** Suppression d'un bloc par la vue (bouton ×) : true si appliqué. */
export function deleteBlock(editor: Editor, pos: number | undefined): boolean {
  if (pos === undefined) return false;
  const tr = deleteBlockAt(editor.state, pos);
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
}

/** Case « MJ » des vues de blocs : applique le changement de portée, true si appliqué. */
export function setBlockGmScope(editor: Editor, pos: number | undefined, gm: boolean): boolean {
  if (pos === undefined) return false;
  const tr = gm ? wrapBlockInSecret(editor.state, pos) : unwrapBlockFromSecret(editor.state, pos);
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
}
