"use client";

import { useState } from "react";
import { CollapsibleSidePanel, usePersistedCollapse } from "@/components/collapsible-side-panel";
import { GameModal } from "@/components/game-modal";
import { LinkIcon } from "@/components/icons";

type Backlink = { id: string; title: string };
type SelectEntry = (id: string) => void;

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

/** Panneau « Liens entrants » : les entrées qui référencent l'entrée active. */
export function BacklinksPanel({
  backlinks,
  selectEntry,
}: {
  backlinks: Backlink[];
  selectEntry: (id: string) => Promise<void>;
}) {
  const [collapsed, toggleCollapsed] = usePersistedCollapse("aetheris:wiki:backlinks-collapsed");
  return (
    <CollapsibleSidePanel
      id="panel-backlinks"
      label={`Liens entrants (${backlinks.length})`}
      side="right"
      collapsed={collapsed}
      onToggle={toggleCollapsed}
      width="w-72"
      className="hidden lg:flex"
    >
      <div className="flex-1 overflow-y-auto p-3">
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
        <div className="max-h-[60vh] overflow-y-auto">
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
