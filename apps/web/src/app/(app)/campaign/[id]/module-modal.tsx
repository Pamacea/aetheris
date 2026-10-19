"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GameModal } from "@/components/game-modal";

/**
 * Fenêtre d'un module (slot `@modal/(.)<slug>`). `frame={false}` : panneau
 * maison épinglé sous la barre de modules (toujours visible grâce au z-index
 * de campaign-tabs) — le contenu module occupe le reste du viewport.
 * Fermeture = `router.back()` : on revient à la page sous-jacente.
 */
export function ModuleModal({ label, children }: { label: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <GameModal open onClose={() => router.back()} label={label} frame={false}>
      <div className="panel fixed top-[6.5rem] bottom-1.5 left-1/2 w-[98vw] -translate-x-1/2 flex flex-col overflow-hidden outline-none">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-2.5">
          <h2 className="text-lg tracking-wide">
            <span className="mark-tri" aria-hidden />
            {label}
          </h2>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Fermer le module"
            className="btn px-2 py-0.5 text-sm"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </GameModal>
  );
}
