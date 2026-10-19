"use client";

/** Panneau « Liens entrants » : les entrées qui référencent l'entrée active. */
export function BacklinksPanel({
  backlinks,
  selectEntry,
}: {
  backlinks: { id: string; title: string }[];
  selectEntry: (id: string) => Promise<void>;
}) {
  return (
    <aside
      id="panel-backlinks"
      aria-label="Liens entrants"
      className="hidden w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:flex"
    >
      <p className="border-b border-border px-3 py-2 text-[0.65rem] tracking-widest text-muted uppercase">
        Liens entrants ({backlinks.length})
      </p>
      <div className="flex-1 overflow-y-auto p-3">
        {backlinks.length === 0 ? (
          <p className="text-xs text-muted">Aucune entrée ne référence encore cette page.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {backlinks.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => void selectEntry(b.id)}
                  className="block w-full truncate border-l-2 border-transparent px-2 py-1.5 text-left text-sm text-muted hover:border-accent hover:text-foreground"
                >
                  {b.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
