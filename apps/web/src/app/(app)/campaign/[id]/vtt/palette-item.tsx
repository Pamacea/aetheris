export const NOTE_MIME = "application/x-aetheris-note";

/** Signal « ouvrir la note dans le panneau Lore » (repli sans callback). */
export const OPEN_NOTE_EVENT = "aetheris:open-note";

export interface NoteDragPayload {
  id: string;
  title: string;
}

export interface PaletteNote {
  id: string;
  title: string;
  folder: string | null;
  /** Nom du template lié (null = note libre). */
  templateName: string | null;
}

/** Entrée de palette : glissable vers la table, cliquable pour ouvrir. */
function PaletteNoteItem({ n, onOpen }: { n: PaletteNote; onOpen: (noteId: string) => void }) {
  return (
    <li
      draggable
      role="button"
      tabIndex={0}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(NOTE_MIME, JSON.stringify({ id: n.id, title: n.title }));
        // Repli pour les cibles qui ignorent le MIME personnalisé.
        e.dataTransfer.setData("text/plain", n.title);
      }}
      onClick={() => onOpen(n.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(n.id);
        }
      }}
      className="cursor-grab truncate border border-border bg-background/60 px-2 py-1 text-xs text-foreground transition hover:border-accent/60 hover:text-accent active:cursor-grabbing"
      title={`${n.title}${n.folder ? ` — ${n.folder}` : ""}${n.templateName ? ` [${n.templateName}]` : ""} (glisser sur la table, cliquer pour ouvrir)`}
    >
      {n.folder && <span className="mr-1.5 text-muted">{n.folder}/</span>}
      {n.title}
      {n.templateName && (
        <span className="ml-1.5 border border-border px-1 text-[0.6rem] tracking-wide text-muted">
          {n.templateName}
        </span>
      )}
    </li>
  );
}

/** Section de palette (Notes / Personnages) avec état vide dédié. */
export function PaletteSection({
  id,
  label,
  items,
  empty,
  onOpen,
}: {
  id: string;
  label: string;
  items: PaletteNote[];
  empty: string;
  onOpen: (noteId: string) => void;
}) {
  return (
    <section role="group" aria-labelledby={id}>
      <h3 id={id} className="mb-1 text-[0.65rem] tracking-widest text-muted uppercase">
        {label}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((n) => (
            <PaletteNoteItem key={n.id} n={n} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  );
}
