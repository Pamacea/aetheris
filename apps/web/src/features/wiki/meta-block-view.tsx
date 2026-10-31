"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { BlockDragHandle } from "./block-handle";
import { BlockResizeEdges } from "./block-resize";
import { deleteBlock } from "./blocks-scope";
import { BlockScopeToggle } from "./blocks-scope-toggle";
import { frameOf, frameStyle, isFloating, sizeTextCls } from "./blocks-frame";

/**
 * Vue React d'un bloc de métadonnées : rend uniquement du texte React
 * (jamais de HTML brut → pas de canal XSS) et édite les attributs inline.
 * Taille/cadrage : aucune commande — les bordures se redimensionnent à la
 * souris (BlockResizeEdges). Portée = petit bouton d'état MJ / ALL,
 * retour au flux (Flux) si flottant, suppression × visible : tout contrôle
 * seulement en édition (`editable: isGM` → rien côté joueur).
 */
export function MetaBlockView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const { kind, label, value } = node.attrs as { kind: string; label: string; value: string };
  const frame = frameOf(node.attrs);
  const editable = editor.isEditable;
  const sizeCls = sizeTextCls(frame.size);
  // Dans le flux : rangée clé-valeur pleine largeur (les blocs consécutifs
  // forment une liste de propriétés). Flottant : largeur du contenu.
  const layoutCls = isFloating(frame) ? "inline-flex" : "flex w-full border-b border-border";
  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={frameStyle(frame)}
      className={`group relative flex-wrap items-center gap-2 border-l-2 border-accent bg-card px-2 py-1 align-middle ${layoutCls}`}
    >
      {editable && (
        <BlockDragHandle editor={editor} updateAttributes={updateAttributes} frame={frame} />
      )}
      <input
        className={`input w-36 shrink-0 py-0.5 ${sizeCls}`}
        name="bloc-meta-libelle"
        aria-label="Libellé du bloc"
        value={label}
        disabled={!editable}
        onChange={(e) => updateAttributes({ label: e.target.value })}
      />
      <input
        className={`input min-w-0 flex-1 py-0.5 ${sizeCls}`}
        name="bloc-meta-valeur"
        aria-label="Valeur du bloc"
        type={kind === "date" ? "date" : "text"}
        value={value}
        placeholder={kind === "date" ? undefined : "Valeur"}
        disabled={!editable}
        onChange={(e) => updateAttributes({ value: e.target.value })}
      />
      {editable && <BlockScopeToggle editor={editor} getPos={getPos} />}
      {editable && isFloating(frame) && (
        <button
          type="button"
          className="btn px-1.5 py-0.5 text-xs"
          title="Remettre le bloc dans le flux du texte"
          onClick={() => updateAttributes({ x: null, y: null })}
        >
          Flux
        </button>
      )}
      {editable && (
        <button
          type="button"
          className="btn px-1.5 py-0.5 text-xs"
          aria-label={`Supprimer le bloc ${label}`}
          title="Supprimer le bloc"
          onClick={() => deleteBlock(editor, getPos())}
        >
          ×
        </button>
      )}
      {editable && (
        <BlockResizeEdges editor={editor} frame={frame} updateAttributes={updateAttributes} />
      )}
    </NodeViewWrapper>
  );
}
