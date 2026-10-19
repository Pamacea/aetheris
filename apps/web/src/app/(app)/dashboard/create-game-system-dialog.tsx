"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GameModal } from "@/components/game-modal";
import { createGameSystem } from "./actions";

export function CreateGameSystemButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createGameSystem(formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button type="button" className="btn btn-tri" onClick={() => setOpen(true)}>
        + Système de jeu
      </button>

      {/* Monté conditionnellement : le formulaire doit être démonté à la
          fermeture pour repartir d'inputs vides. frame={false} : il porte
          déjà son panneau et son entête. Échap/clic → close() (bloqué
          pendant `pending`). */}
      {open && (
        <GameModal open={open} onClose={close} label="Créer un système de jeu" frame={false}>
          <form
            onSubmit={handleSubmit}
            className="panel relative flex max-h-[90vh] w-[min(92vw,540px)] flex-col overflow-y-auto p-6"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-xl tracking-wide">
                <span className="mark-tri" aria-hidden />
                Créer un système de jeu
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="btn px-2 py-0.5 text-sm"
              >
                ✕
              </button>
            </header>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                  Nom du système
                </span>
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoFocus
                  placeholder="Ex. Ombres d'Aetheris"
                  className="input"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">
                  Description (optionnel)
                </span>
                <textarea
                  name="description"
                  maxLength={500}
                  rows={3}
                  placeholder="Feuilles de personnages, objets, cartes…"
                  className="input resize-none"
                />
              </label>

              <p className="text-xs text-muted">
                La structure (feuilles, objets, cartes) se définit ensuite dans l&apos;éditeur de
                campagne.
              </p>
            </div>

            {error && (
              <p className="mt-4 border border-destructive/60 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <footer className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={close} disabled={pending} className="btn">
                Annuler
              </button>
              <button type="submit" disabled={pending} className="btn btn-primary btn-broken">
                {pending ? "Création…" : "Valider"}
              </button>
            </footer>
          </form>
        </GameModal>
      )}
    </>
  );
}
