import type { Dispatch, ReactNode, SetStateAction } from "react";
import { NOTE_MIME, type NoteDragPayload } from "./notes-palette";

interface VttTheatreProps {
  isGM: boolean;
  theatreNotes: { id: string; title: string }[];
  setTheatreNotes: Dispatch<SetStateAction<{ id: string; title: string }[]>>;
  setLoreNoteId: Dispatch<SetStateAction<string | null>>;
  setFicheTokenId: Dispatch<SetStateAction<string | null>>;
  /** Fiche ouverte — même nœud qu'en table (le conteneur de table est masqué). */
  fiche: ReactNode;
}

/**
 * Repli Theatre of the Mind : masque la table, affiche les notes posées.
 * Chat et dés restent actifs dans le panneau latéral.
 */
export function VttTheatre({
  isGM,
  theatreNotes,
  setTheatreNotes,
  setLoreNoteId,
  setFicheTokenId,
  fiche,
}: VttTheatreProps) {
  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData(NOTE_MIME);
        if (!raw) return;
        let payload: NoteDragPayload;
        try {
          payload = JSON.parse(raw) as NoteDragPayload;
        } catch {
          return;
        }
        if (!payload?.id || !payload.title) return;
        setTheatreNotes((ns) =>
          ns.some((n) => n.id === payload.id)
            ? ns
            : [...ns, { id: payload.id, title: payload.title }],
        );
      }}
    >
      <p className="text-sm">Mode Theatre of the Mind</p>
      {theatreNotes.length === 0 ? (
        <p className="text-xs text-muted">Glissez une note ici pour la poser sur la scène.</p>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {theatreNotes.map((n) => (
            <li key={n.id} className="panel relative flex items-start gap-2 p-3 text-left">
              <button
                type="button"
                onClick={() => {
                  setLoreNoteId(n.id);
                  setFicheTokenId(null);
                }}
                className="min-w-0 flex-1 cursor-pointer text-left"
                title={`Ouvrir « ${n.title} »`}
              >
                <span className="block truncate text-sm">{n.title}</span>
                <span className="block text-[0.65rem] tracking-widest text-muted uppercase">
                  Note
                </span>
              </button>
              {isGM && (
                <button
                  type="button"
                  aria-label="Retirer"
                  title="Retirer de la scène"
                  onClick={() => setTheatreNotes((ns) => ns.filter((x) => x.id !== n.id))}
                  className="btn shrink-0 px-1.5 py-0.5 text-xs text-muted hover:text-destructive"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        La table est masquée — chat et jets de dés restent actifs à droite. Glissez une note de la
        palette Lore sur cette zone pour la poser en scène ; cliquez une carte pour ouvrir sa fiche.
        Cliquez sur «&nbsp;Théâtre&nbsp;» pour revenir à la carte.
      </p>
      {fiche}
    </div>
  );
}
