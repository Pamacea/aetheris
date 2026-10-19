import type { NoteBlock } from "@aetheris/shared";

/** Zone de valeur d'un bloc : champs macro (source/expression/jet) ou simple. */
export function BlockValueFields({
  block: b,
  update,
  notes,
  noteType,
  noteId,
  evalMacro,
  scopeOf,
  rollBlock,
  rollResult,
}: {
  block: NoteBlock;
  update: (patch: Partial<NoteBlock>) => void;
  /** Toutes les notes de la campagne (select « Source » des macros). */
  notes: { id: string; title: string; type: string }[];
  noteType: string;
  noteId: string;
  evalMacro: (b: NoteBlock) => string | null;
  scopeOf: (b: NoteBlock) => Record<string, number> | null;
  rollBlock: (b: NoteBlock) => void;
  rollResult: (b: NoteBlock) => React.ReactNode;
}) {
  if (b.kind !== "macro") {
    return (
      <input
        className="input py-1 text-sm"
        name="bloc-valeur"
        aria-label="Valeur"
        type={b.kind === "date" ? "date" : "text"}
        placeholder="Valeur (ex. Après l’Effondrement)"
        value={b.value}
        onChange={(e) => update({ value: e.target.value })}
      />
    );
  }
  return (
    <>
      <select
        className="input py-1 text-xs"
        name="bloc-source"
        aria-label="Source"
        value={b.refNoteId ?? (noteType !== "note" ? noteId : "")}
        onChange={(e) => update({ refNoteId: e.target.value || undefined })}
      >
        <option value="">— Choisir une fiche —</option>
        {notes
          .filter((n) => n.type !== "note")
          .map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
      </select>
      <input
        className="input py-1 text-sm"
        name="bloc-expression"
        aria-label="Expression"
        placeholder="Ex. force + constitution"
        value={b.expr ?? ""}
        onChange={(e) => update({ expr: e.target.value || undefined })}
      />
      <input
        className="input py-1 text-sm"
        name="bloc-expression-jet"
        aria-label="Expression de jet"
        placeholder="Ex. 1d20 + @mod"
        value={b.roll ?? ""}
        onChange={(e) => update({ roll: e.target.value || undefined })}
      />
      {b.expr && <p className="font-mono text-xs text-accent">{evalMacro(b)}</p>}
      {b.roll && scopeOf(b) && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn px-2 py-0.5 text-xs"
            aria-label={`Lancer le jet : ${b.roll}`}
            onClick={() => rollBlock(b)}
          >
            ⚄ {b.roll}
          </button>
          {rollResult(b)}
        </div>
      )}
    </>
  );
}
