import type { NoteBlock } from "@aetheris/shared";
import { DND_PRESETS } from "./extensions";
import {
  BLOCK_MIME,
  KIND_LABELS,
  blockFromPayload,
  payloadOf,
  readPayload,
  type BlockDragPayload,
} from "./blocks-dnd";

/** Sous-onglet « Bibliothèque » : favoris + blocs custom de campagne,
 *  ajout par glisser-déposer ou clic, drop pour sauvegarder un favori. */
export function BlocksLibrary({
  isGM,
  blocks,
  lib,
  libOver,
  setLibOver,
  scheduleBlocks,
  scheduleLib,
}: {
  /** Le MJ édite ; le joueur ne reçoit que les blocs non-gm, en lecture seule. */
  isGM: boolean;
  blocks: NoteBlock[];
  lib: NoteBlock[];
  libOver: boolean;
  setLibOver: (v: boolean) => void;
  scheduleBlocks: (next: NoteBlock[]) => void;
  scheduleLib: (next: NoteBlock[]) => void;
}) {
  /** Ajout au clic : alternative clavier au glisser-déposer (accessibilité). */
  function addFromLibrary(p: BlockDragPayload) {
    if (!isGM) return;
    scheduleBlocks([...blocks, blockFromPayload(p)]);
  }

  /** Drop sur la Bibliothèque : sauvegarde d'un bloc de la note comme favori. */
  function handleLibDrop(e: React.DragEvent) {
    const p = readPayload(e);
    if (!p || typeof p.index !== "number" || !isGM) return;
    e.preventDefault();
    setLibOver(false);
    scheduleLib([...lib, blockFromPayload(p)]);
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onDragOver={(e) => {
        if (!isGM || !e.dataTransfer.types.includes(BLOCK_MIME)) return;
        e.preventDefault();
        setLibOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setLibOver(false);
      }}
      onDrop={handleLibDrop}
    >
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-[0.6rem] tracking-widest text-muted uppercase">Favoris</p>
        <p className="mb-2 text-[0.65rem] leading-snug text-muted">
          {isGM
            ? "Glissez un bloc vers la note ou l’onglet Blocs — ou cliquez pour l’ajouter. Déposez ici un bloc de la note pour le sauvegarder."
            : "Blocs disponibles pour cette campagne."}
        </p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {DND_PRESETS.flatMap((pack) =>
            pack.items.map((it) => (
              <li key={`${pack.pack}-${it.title}`}>
                <button
                  type="button"
                  draggable={isGM}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData(
                      BLOCK_MIME,
                      JSON.stringify({
                        kind: it.kind,
                        label: it.label,
                        value: "",
                      } satisfies BlockDragPayload),
                    );
                  }}
                  onClick={() => addFromLibrary({ kind: it.kind, label: it.label, value: "" })}
                  className="flex w-full cursor-grab items-baseline justify-between gap-2 border border-border bg-background px-2 py-1 text-left hover:border-accent hover:bg-card-hover active:cursor-grabbing"
                >
                  <span className="text-xs text-foreground">{it.title}</span>
                  <span className="text-[0.6rem] text-muted uppercase">{pack.pack}</span>
                </button>
              </li>
            )),
          )}
        </ul>

        <p className="text-[0.6rem] tracking-widest text-muted uppercase">Ma bibliothèque</p>
        {lib.length === 0 ? (
          <p className="mt-1 text-[0.65rem] text-muted">Aucun bloc personnalisé enregistré.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1.5">
            {lib.map((b, i) => (
              <li
                key={b.id}
                className={`flex items-center gap-1 border px-2 py-1 ${
                  libOver ? "border-accent" : "border-border"
                } bg-background`}
              >
                <button
                  type="button"
                  className="flex flex-1 cursor-grab items-baseline justify-between gap-2 text-left active:cursor-grabbing"
                  draggable={isGM}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData(BLOCK_MIME, JSON.stringify(payloadOf(b)));
                  }}
                  onClick={() => addFromLibrary(payloadOf(b))}
                >
                  <span className="truncate text-xs text-foreground">{b.label}</span>
                  <span className="shrink-0 text-[0.6rem] text-muted uppercase">
                    {KIND_LABELS[b.kind]}
                  </span>
                </button>
                {isGM && (
                  <button
                    type="button"
                    className="btn px-1.5 py-0.5 text-xs text-destructive"
                    aria-label={`Retirer le bloc ${b.label} de la bibliothèque`}
                    onClick={() => scheduleLib(lib.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
