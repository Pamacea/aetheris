"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { deleteBlock } from "./blocks-scope";
import { BlockScopeToggle } from "./blocks-scope-toggle";
import { parseRows } from "./readable";

/** Matrice par défaut d'un nouveau bloc tableau (partagée avec l'extension). */
export const DEFAULT_TABLE_ROWS: string[][] = [
  ["Colonne", "Valeur"],
  ["", ""],
];

/**
 * Vue d'un « tableau de stats » : lignes/colonnes d'inputs, structure
 * stockée en JSON dans `data-rows` (le bloc est atomique). Bloc dans le
 * flux : aucune position absolue, aucune poignée.
 */
export function TableBlockView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const editable = editor.isEditable;
  const stored = parseRows(String(node.attrs.rows ?? ""));
  const rows = stored.length > 0 ? stored : DEFAULT_TABLE_ROWS;
  const cols = Math.max(1, ...rows.map((r) => r.length));
  // Matrice rectangulaire : les lignes courtes sont complétées à la volée.
  const grid = rows.map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? ""));

  function write(next: string[][]) {
    updateAttributes({ rows: JSON.stringify(next) });
  }
  function edit(ri: number, ci: number, value: string) {
    const next = grid.map((row) => [...row]);
    next[ri] = [...(next[ri] ?? [])];
    next[ri]![ci] = value;
    write(next);
  }
  function addRow() {
    write([...grid, Array.from({ length: cols }, () => "")]);
  }
  function addCol() {
    write(grid.map((r) => [...r, ""]));
  }
  function removeRow() {
    if (grid.length > 1) write(grid.slice(0, -1));
  }
  function removeCol() {
    if (cols > 1) write(grid.map((r) => r.slice(0, -1)));
  }

  return (
    <NodeViewWrapper as="div" contentEditable={false} className="my-2">
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {grid.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border border-border p-0"
                  style={{ width: `${100 / cols}%` }}
                >
                  <input
                    className="input w-full border-0 px-1.5 py-0.5 text-xs"
                    aria-label={`Cellule ligne ${ri + 1} colonne ${ci + 1}`}
                    value={cell}
                    disabled={!editable}
                    onChange={(e) => edit(ri, ci, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn px-1.5 py-0.5 text-xs" onClick={addRow}>
            + Ligne
          </button>
          <button type="button" className="btn px-1.5 py-0.5 text-xs" onClick={addCol}>
            + Colonne
          </button>
          <button
            type="button"
            className="btn px-1.5 py-0.5 text-xs"
            onClick={removeRow}
            disabled={grid.length <= 1}
          >
            − Ligne
          </button>
          <button
            type="button"
            className="btn px-1.5 py-0.5 text-xs"
            onClick={removeCol}
            disabled={cols <= 1}
          >
            − Colonne
          </button>
          <BlockScopeToggle editor={editor} getPos={getPos} className="ml-1" />
          <button
            type="button"
            className="btn px-1.5 py-0.5 text-xs"
            aria-label="Supprimer le tableau"
            title="Supprimer le tableau"
            onClick={() => deleteBlock(editor, getPos())}
          >
            ×
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}
