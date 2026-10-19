import type { NoteBlock } from "@aetheris/shared";

/** Liste lecture seule (joueur). */
export function BlocksReadOnlyList({
  blocks,
  evalMacro,
  scopeOf,
  rollBlock,
  rollResult,
}: {
  blocks: NoteBlock[];
  evalMacro: (b: NoteBlock) => string | null;
  scopeOf: (b: NoteBlock) => Record<string, number> | null;
  rollBlock: (b: NoteBlock) => void;
  rollResult: (b: NoteBlock) => React.ReactNode;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      {blocks.length === 0 ? (
        <p className="text-xs text-muted">Aucun bloc.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocks.map((b) => (
            <li key={b.id} className="border-b border-border pb-1.5">
              <p className="text-[0.6rem] tracking-widest text-muted uppercase">{b.label}</p>
              {b.kind === "macro" ? (
                <>
                  <p
                    className={`${b.size === "sm" ? "text-xs" : b.size === "lg" ? "text-lg" : "text-sm"} text-foreground`}
                  >
                    {evalMacro(b) ?? b.value}
                  </p>
                  {b.roll && scopeOf(b) && (
                    <button
                      type="button"
                      className="btn px-2 py-0.5 text-xs"
                      aria-label={`Lancer le jet : ${b.roll}`}
                      onClick={() => rollBlock(b)}
                    >
                      ⚄ {b.roll}
                    </button>
                  )}
                  {rollResult(b)}
                </>
              ) : (
                <p
                  className={`${b.size === "sm" ? "text-xs" : b.size === "lg" ? "text-lg" : "text-sm"} text-foreground`}
                >
                  {b.value}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
