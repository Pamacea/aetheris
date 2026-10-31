"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GameModal } from "@/components/game-modal";

// Détection client sans setState d'effet : serveur = false, client = true.
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Confirmation modale maison — remplace `window.confirm` pour garder la DA.
 * `pending` verrouille la modale le temps de l'action (fermeture comprise).
 * Portail : le `clip-path` des cartes piège `position: fixed` dans leur
 * stacking context, sinon les sections suivantes passent devant la modale.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (!mounted) return null;

  return createPortal(
    <GameModal open={open} onClose={() => !pending && onClose()} label={title}>
      <div className="flex flex-col gap-4">
        {description && <p className="text-sm text-muted">{description}</p>}
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="btn px-3 py-1.5 text-xs"
            disabled={pending}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn px-3 py-1.5 text-xs ${danger ? "btn-broken" : "btn-primary"}`}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "En cours…" : confirmLabel}
          </button>
        </footer>
      </div>
    </GameModal>,
    document.body,
  );
}
