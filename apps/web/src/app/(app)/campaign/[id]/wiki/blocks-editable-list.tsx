import { Fragment, useState } from "react";
import { noteBlockKindSchema, type NoteBlock } from "@aetheris/shared";
import { BLOCK_MIME, KIND_LABELS, payloadOf } from "./blocks-dnd";
import { createListOps } from "./blocks-list-ops";
import { BlockValueFields } from "./blocks-value-fields";
/** Liste éditable (MJ) : draggable + zones de drop / réordonnancement. */
export function BlocksEditableList({
  isGM,
  blocks,
  dragOver,
  setDragOver,
  scheduleBlocks,
  notes,
  noteType,
  noteId,
  evalMacro,
  scopeOf,
  rollBlock,
  rollResult,
}: {
  isGM: boolean;
  blocks: NoteBlock[];
  dragOver: number | null;
  setDragOver: (v: number | null) => void;
  scheduleBlocks: (next: NoteBlock[]) => void;
  /** Toutes les notes de la campagne (select « Source » des macros). */
  notes: { id: string; title: string; type: string }[];
  noteType: string;
  noteId: string;
  evalMacro: (b: NoteBlock) => string | null;
  scopeOf: (b: NoteBlock) => Record<string, number> | null;
  rollBlock: (b: NoteBlock) => void;
  rollResult: (b: NoteBlock) => React.ReactNode;
}) {
  const { update, remove, handleListDrop } = createListOps({
    blocks,
    scheduleBlocks,
    setDragOver,
  });
  // Config ⚙ repliée : index du bloc déplié (null = aucun).
  const [cfg, setCfg] = useState<number | null>(null);
  return (
    <div
      className="flex-1 overflow-y-auto p-3"
      onDragOver={(e) => {
        if (!isGM || !e.dataTransfer.types.includes(BLOCK_MIME)) return;
        e.preventDefault();
        setDragOver(blocks.length);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null);
      }}
      onDrop={(e) => isGM && handleListDrop(e, blocks.length)}
    >
      {blocks.length === 0 && (
        <p className="text-xs text-muted">
          Aucun bloc. Glissez-en un depuis la Bibliothèque pour structurer la note.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {blocks.map((b, i) => (
          <Fragment key={b.id}>
            <li
              className={`flex flex-col gap-1.5 border px-2 py-1.5 ${
                dragOver === i ? "border-accent" : "border-border"
              } bg-background`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(BLOCK_MIME, JSON.stringify(payloadOf(b, i)));
              }}
              onDragEnd={() => setDragOver(null)}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(BLOCK_MIME)) return;
                e.preventDefault();
                e.stopPropagation();
                setDragOver(i);
              }}
              onDrop={(e) => handleListDrop(e, i)}
            >
              <div className="flex items-center gap-1">
                <select
                  className="input py-0.5 text-xs"
                  name={`bloc-${i}-type`}
                  aria-label="Type de bloc"
                  value={b.kind}
                  onChange={(e) => update(i, { kind: e.target.value as NoteBlock["kind"] })}
                >
                  {noteBlockKindSchema.options.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                {b.gm && (
                  <span className="text-[0.6rem] tracking-widest text-accent uppercase">MJ</span>
                )}
                <span
                  aria-hidden
                  className="ml-auto cursor-grab text-muted"
                  title="Glisser pour déplacer"
                >
                  ⠿
                </span>
                <button
                  type="button"
                  className="btn px-2 py-0.5 text-xs"
                  aria-label={`Configuration du bloc ${b.label}`}
                  aria-expanded={cfg === i}
                  title="Configuration du bloc"
                  onClick={() => setCfg(cfg === i ? null : i)}
                >
                  ⚙
                </button>
                <button
                  type="button"
                  className="btn px-2 py-0.5 text-xs"
                  aria-label={`Supprimer le bloc ${b.label}`}
                  onClick={() => remove(i)}
                >
                  ×
                </button>
              </div>
              <input
                className="input py-1 text-sm"
                name={`bloc-${i}-libelle`}
                aria-label="Libellé"
                placeholder="Libellé (ex. Ère)"
                value={b.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <BlockValueFields
                block={b}
                update={(patch) => update(i, patch)}
                notes={notes}
                noteType={noteType}
                noteId={noteId}
                evalMacro={evalMacro}
                scopeOf={scopeOf}
                rollBlock={rollBlock}
                rollResult={rollResult}
              />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  name={`bloc-${i}-gm`}
                  checked={b.gm ?? false}
                  onChange={(e) => update(i, { gm: e.target.checked })}
                />
                MJ seulement
              </label>
              {cfg === i && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  Taille
                  <select
                    className="input py-0.5 text-xs"
                    name={`bloc-${i}-size`}
                    aria-label="Taille du bloc"
                    value={b.size ?? "md"}
                    onChange={(e) =>
                      update(i, { size: e.target.value as NonNullable<NoteBlock["size"]> })
                    }
                  >
                    <option value="sm">Petit</option>
                    <option value="md">Moyen</option>
                    <option value="lg">Grand</option>
                  </select>
                </label>
              )}
            </li>
            {dragOver === i && <li role="presentation" aria-hidden className="h-0.5 bg-accent" />}
          </Fragment>
        ))}
      </ul>
      {dragOver === blocks.length && (
        <div role="presentation" aria-hidden className="mt-2 h-0.5 bg-accent" />
      )}
    </div>
  );
}
