"use client";

import type { Handout } from "@aetheris/shared";

/** Détail d'un handout : image, texte, actions MJ. */
export function JournalDetail({
  entry,
  isGM,
  pending,
  error,
  onBack,
  onEdit,
  onToggleShared,
  onRemove,
}: {
  entry: Handout;
  isGM: boolean;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onEdit: (entry: Handout) => void;
  onToggleShared: (entry: Handout) => void;
  onRemove: (entry: Handout) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="mx-auto flex flex-col gap-4">
        <button type="button" className="btn self-start" onClick={onBack}>
          ← Retour au journal
        </button>
        <article className="panel flex flex-col gap-4 p-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-2xl">{entry.title}</h1>
              <span className="text-[0.65rem] tracking-widest text-muted uppercase">
                {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                {entry.shared ? " · Partagé" : " · Brouillon"}
              </span>
            </div>
            {isGM && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => onEdit(entry)}
                  disabled={pending}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => onToggleShared(entry)}
                  disabled={pending}
                >
                  {entry.shared ? "Désharer" : "Partager"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => onRemove(entry)}
                  disabled={pending}
                >
                  Supprimer
                </button>
              </div>
            )}
          </header>
          {entry.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.imageUrl}
              alt={entry.title}
              className="panel max-h-96 w-full object-contain"
            />
          )}
          {entry.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          )}
        </article>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
