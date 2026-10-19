"use client";

/** Modale d'historique des versions d'une note. */
export function WikiAppHistory({
  history,
  onClose,
  onRestore,
}: {
  history: { id: string; createdAt: string }[];
  onClose: () => void;
  onRestore: (versionId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6">
      <div className="panel w-96 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm tracking-widest uppercase">Historique</h2>
          <button type="button" className="btn px-2 py-0.5 text-xs" onClick={onClose}>
            Fermer
          </button>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted">
            Aucune version enregistrée (une version est créée toutes les 5 minutes d’édition).
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {history.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm"
              >
                <span className="text-muted">
                  {new Date(v.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <button
                  type="button"
                  className="btn px-2 py-0.5 text-xs text-accent"
                  onClick={() => onRestore(v.id)}
                >
                  Restaurer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
