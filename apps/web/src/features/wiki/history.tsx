"use client";

import { GameModal } from "@/components/game-modal";

/** Modale d'historique des versions d'une note (focus trap + Échap via GameModal). */
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
    <GameModal open onClose={onClose} label="Historique des versions">
      {history.length === 0 ? (
        <p className="text-xs text-muted">
          Aucune version enregistrée (une version est créée toutes les 5 minutes d’édition).
        </p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
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
    </GameModal>
  );
}
