"use client";

import type { Handout } from "@aetheris/shared";

/** Grille des handouts + bouton de création MJ. */
export function JournalList({
  entries,
  isGM,
  error,
  onSelect,
  onCreate,
}: {
  entries: Handout[];
  isGM: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {entries.length} handout{entries.length > 1 ? "s" : ""}
            {!isGM && " partagés"}
          </p>
          {isGM && (
            <button type="button" className="btn" onClick={onCreate}>
              + Nouveau handout
            </button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {entries.length === 0 ? (
          <p className="panel p-6 text-center text-sm text-muted">
            {isGM
              ? "Aucun handout — créez le premier (texte + image) pour le partager aux joueurs."
              : "Le MJ n'a encore rien partagé."}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e.id)}
                  className="panel flex h-full w-full flex-col gap-2 p-4 text-left hover:bg-card-hover"
                >
                  {e.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.imageUrl} alt="" className="h-28 w-full object-cover" />
                  )}
                  <span className="font-medium">{e.title}</span>
                  <span className="text-xs text-muted line-clamp-2">{e.content || "—"}</span>
                  {isGM && (
                    <span
                      className={`mt-auto text-[0.65rem] tracking-widest uppercase ${
                        e.shared ? "text-accent" : "text-muted"
                      }`}
                    >
                      {e.shared ? "Partagé" : "Brouillon"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
