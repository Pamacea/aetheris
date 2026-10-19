"use client";

import { useState } from "react";
import { FichePanel } from "../vtt/fiche-panel";

export type FicheMeta = {
  id: string;
  title: string;
  templateName: string;
};

/**
 * Module Fiches joueurs (plugin `fiches`) : liste des entités liées à un
 * template à gauche, édition réutilisant le panneau fiche de la VTT
 * (TemplateForm + autosave) à droite — aucune logique dupliquée.
 */
export function FichesApp({ campaignId, fiches }: { campaignId: string; fiches: FicheMeta[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = fiches.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="relative flex min-h-0 flex-1">
      <ul className="flex w-72 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3">
        {fiches.length === 0 && (
          <p className="px-1 text-xs text-muted">
            Aucune fiche — créez un template dans le wiki, puis une entité qui l&apos;utilise.
          </p>
        )}
        {fiches.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setSelectedId(f.id)}
              aria-current={selectedId === f.id}
              className={`flex w-full flex-col gap-0.5 border px-3 py-2 text-left text-xs transition-colors ${
                selectedId === f.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-transparent text-muted hover:border-border hover:text-foreground"
              }`}
            >
              <span className="truncate">{f.title}</span>
              <span className="text-[0.6rem] tracking-widest text-muted uppercase">
                {f.templateName}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <FichePanel
          campaignId={campaignId}
          entityId={selected.id}
          tokenName={selected.title}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
