"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

/**
 * Vue React d'un bloc de métadonnées : rend uniquement du texte React
 * (jamais de HTML brut → pas de canal XSS) et édite les attributs inline.
 * Config ⚙ (taille) et suppression × seulement en édition (éditeur MJ) :
 * côté joueur `editor.isEditable` est faux → aucun bouton d'écriture.
 */
export function MetaBlockView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const { kind, label, value, size } = node.attrs as {
    kind: string;
    label: string;
    value: string;
    size: string;
  };
  const [cfg, setCfg] = useState(false);
  const editable = editor.isEditable;
  const sizeCls = size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm";
  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      className="my-1 inline-flex items-center gap-2 border-l-2 border-accent bg-card px-2 py-1 align-middle"
    >
      <input
        className={`input w-36 py-0.5 ${sizeCls}`}
        name="bloc-meta-libelle"
        aria-label="Libellé du bloc"
        value={label}
        onChange={(e) => updateAttributes({ label: e.target.value })}
      />
      <input
        className={`input py-0.5 ${sizeCls}`}
        name="bloc-meta-valeur"
        aria-label="Valeur du bloc"
        type={kind === "date" ? "date" : "text"}
        value={value}
        onChange={(e) => updateAttributes({ value: e.target.value })}
      />
      {editable && (
        <>
          <button
            type="button"
            className="btn px-1.5 py-0.5 text-xs"
            aria-label={`Configuration du bloc ${label}`}
            aria-expanded={cfg}
            title="Configuration du bloc"
            onClick={() => setCfg(!cfg)}
          >
            ⚙
          </button>
          <button
            type="button"
            className="btn px-1.5 py-0.5 text-xs"
            aria-label={`Supprimer le bloc ${label}`}
            title="Supprimer le bloc"
            onClick={() => deleteNode()}
          >
            ×
          </button>
        </>
      )}
      {editable && cfg && (
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Taille
          <select
            className="input py-0.5 text-xs"
            aria-label="Taille du bloc"
            value={size || "md"}
            onChange={(e) => updateAttributes({ size: e.target.value })}
          >
            <option value="sm">Petit</option>
            <option value="md">Moyen</option>
            <option value="lg">Grand</option>
          </select>
        </label>
      )}
    </NodeViewWrapper>
  );
}
