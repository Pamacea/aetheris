"use client";

import { useState } from "react";
import { CollapsibleSidePanel, usePersistedCollapse } from "@/components/collapsible-side-panel";
import { GameModal } from "@/components/game-modal";
import { LinkIcon } from "@/components/icons";
import type { WikiActiveEntry } from "./types";

type Backlink = { id: string; title: string };
type SelectEntry = (id: string) => void;

/** Mots du corps (balises retirées) — aperçu de la fiche, pas une mesure exacte. */
function wordCount(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

function BacklinksList({
  backlinks,
  selectEntry,
}: {
  backlinks: Backlink[];
  selectEntry: SelectEntry;
}) {
  if (backlinks.length === 0) {
    return <p className="text-xs text-muted">Aucune entrée ne référence encore cette page.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {backlinks.map((b) => (
        <li key={b.id}>
          <button
            type="button"
            onClick={() => selectEntry(b.id)}
            className="block w-full truncate border-l-2 border-transparent px-2 py-1.5 text-left text-sm text-muted hover:border-accent hover:text-foreground"
          >
            {b.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Panneau droit : métadonnées de l'entrée active + entrées qui la référencent. */
export function BacklinksPanel({
  active,
  backlinks,
  selectEntry,
}: {
  active: WikiActiveEntry | null;
  backlinks: Backlink[];
  selectEntry: (id: string) => Promise<void>;
}) {
  const [collapsed, toggleCollapsed] = usePersistedCollapse("aetheris:wiki:backlinks-collapsed");
  return (
    <CollapsibleSidePanel
      id="panel-backlinks"
      label="Détails & liens"
      side="right"
      collapsed={collapsed}
      onToggle={toggleCollapsed}
      width="w-72"
      className="hidden lg:flex"
    >
      <div className="no-scrollbar flex-1 overflow-y-auto p-3">
        {active && (
          <section
            aria-label="Métadonnées de l’entrée"
            className="mb-4 border-b border-border pb-3"
          >
            <p className="mb-2 text-[0.6rem] tracking-widest text-muted uppercase">Métadonnées</p>
            <dl className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Type</dt>
                <dd className="truncate text-right">{active.template?.name ?? "Note libre"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Dossier</dt>
                <dd className="truncate text-right">{active.folder ?? "Racine"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Visibilité</dt>
                <dd className={`text-right ${active.gmOnly ? "text-accent" : ""}`}>
                  {active.gmOnly ? "MJ uniquement" : "Joueurs"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Longueur</dt>
                <dd className="text-right">{wordCount(active.contentHtml)} mots</dd>
              </div>
            </dl>
          </section>
        )}
        <p className="mb-2 text-[0.6rem] tracking-widest text-muted uppercase">
          Liens entrants ({backlinks.length})
        </p>
        <BacklinksList backlinks={backlinks} selectEntry={(id) => void selectEntry(id)} />
      </div>
    </CollapsibleSidePanel>
  );
}

/**
 * Accès aux liens entrants sous `lg` : le panneau latéral est masqué à cette
 * taille, ce bouton ouvre la même liste dans une modale.
 */
export function BacklinksMobile({
  backlinks,
  selectEntry,
}: {
  backlinks: Backlink[];
  selectEntry: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 border border-border bg-card px-2.5 text-xs text-muted transition hover:border-accent/60 hover:bg-card-hover hover:text-foreground"
      >
        <LinkIcon />
        Liens entrants ({backlinks.length})
      </button>
      <GameModal open={open} onClose={() => setOpen(false)} label="Liens entrants">
        <div className="no-scrollbar max-h-[60vh] overflow-y-auto">
          <BacklinksList
            backlinks={backlinks}
            selectEntry={(id) => {
              setOpen(false);
              void selectEntry(id);
            }}
          />
        </div>
      </GameModal>
    </>
  );
}
