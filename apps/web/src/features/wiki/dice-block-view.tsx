"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { deleteBlock } from "./blocks-scope";
import { BlockScopeToggle } from "./blocks-scope-toggle";
import { resolveJet } from "./jet";

/**
 * Vue d'un bloc « Jet de dés » : libellé + expression (`1d20+3`) et
 * lancement local. Le résultat n'est jamais persisté (rejouable à volonté).
 * Bloc dans le flux : aucune position absolue, aucune poignée.
 */
export function DiceBlockView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const { label, expr } = node.attrs as { label: string; expr: string };
  const editable = editor.isEditable;
  const [result, setResult] = useState<{ total: number; detail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function launch() {
    const r = resolveJet(expr);
    if (r.ok) {
      setResult({ total: r.total, detail: r.detail });
      setError(null);
    } else {
      setError(r.error);
      setResult(null);
    }
  }

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      className="my-2 flex flex-wrap items-center gap-2 border-l-2 border-accent bg-card px-2 py-1.5"
    >
      <input
        className="input w-32 py-0.5 text-xs"
        aria-label="Libellé du jet"
        value={label}
        disabled={!editable}
        onChange={(e) => updateAttributes({ label: e.target.value })}
      />
      <input
        className="input w-36 py-0.5 font-mono text-xs"
        aria-label="Expression du jet (ex. 1d20+3)"
        value={expr}
        disabled={!editable}
        onChange={(e) => updateAttributes({ expr: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            launch();
          }
        }}
      />
      <button type="button" className="btn px-2 py-0.5 text-xs" onClick={launch}>
        Lancer
      </button>
      <output className="font-mono text-sm text-accent" aria-live="polite">
        {result ? `${result.total}${result.detail ? ` (${result.detail})` : ""}` : ""}
      </output>
      {error && <span className="text-xs text-destructive">{error}</span>}
      {editable && <BlockScopeToggle editor={editor} getPos={getPos} />}
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
    </NodeViewWrapper>
  );
}
