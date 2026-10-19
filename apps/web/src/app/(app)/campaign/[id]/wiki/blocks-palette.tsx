import type { NoteBlock } from "@aetheris/shared";
import { DND_PRESETS } from "./extensions";
import { BLOCK_MIME, KIND_LABELS, payloadOf, type BlockDragPayload } from "./blocks-dnd";

/**
 * Palette compacte en tête de l'onglet Blocs : presets de campagne + favoris,
 * à glisser dans la liste (ou dans la note) — ou cliquer pour ajouter en fin.
 */
export function BlocksPalette({
  lib,
  onPick,
}: {
  lib: NoteBlock[];
  onPick: (p: BlockDragPayload) => void;
}) {
  const chips = [
    ...DND_PRESETS.flatMap((pack) =>
      pack.items.map((it) => ({
        key: `${pack.pack}-${it.title}`,
        title: it.title,
        hint: pack.pack,
        payload: { kind: it.kind, label: it.label, value: "" } satisfies BlockDragPayload,
      })),
    ),
    ...lib.map((b) => ({
      key: b.id,
      title: b.label,
      hint: KIND_LABELS[b.kind],
      payload: payloadOf(b),
    })),
  ];
  return (
    <div className="shrink-0 border-b border-border px-3 py-2">
      <p className="mb-1 text-[0.6rem] tracking-widest text-muted uppercase">Ajouter un bloc</p>
      <ul className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {chips.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(BLOCK_MIME, JSON.stringify(c.payload));
              }}
              onClick={() => onPick(c.payload)}
              title={`Glisser dans la liste ou cliquer pour ajouter — ${c.hint}`}
              className="flex cursor-grab items-baseline gap-1.5 border border-border bg-background px-2 py-1 whitespace-nowrap hover:border-accent hover:bg-card-hover active:cursor-grabbing"
            >
              <span className="text-xs text-foreground">{c.title}</span>
              <span className="text-[0.6rem] text-muted uppercase">{c.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
