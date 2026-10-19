"use client";

/** Onglet « Liens entrants » du panneau latéral droit. */
export function WikiAppBacklinks({
  backlinks,
  selectNote,
}: {
  backlinks: { id: string; title: string }[];
  selectNote: (id: string) => Promise<void>;
}) {
  return (
    <div
      id="panel-backlinks"
      role="tabpanel"
      aria-labelledby="tab-backlinks"
      className="flex-1 overflow-y-auto p-3"
    >
      {backlinks.length === 0 ? (
        <p className="text-xs text-muted">Aucune note ne référence encore cette page.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {backlinks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => void selectNote(b.id)}
                className="block w-full truncate border-l-2 border-transparent px-2 py-1.5 text-left text-sm text-muted hover:border-accent hover:text-foreground"
              >
                {b.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
