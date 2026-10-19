"use client";

import { useState } from "react";
import type { NoteBlock } from "@aetheris/shared";
import { useDiceRoll } from "@/lib/use-dice-roll";
import { useBlocksAutosave } from "./blocks-autosave";
import { useBlockScopes } from "./blocks-scopes";
import { createRollHelpers } from "./blocks-rolls";
import { BlocksSubTabs, type SubTab } from "./blocks-subtabs";
import { BlocksEditableList } from "./blocks-editable-list";
import { BlocksReadOnlyList } from "./blocks-readonly-list";
import { BlocksLibrary } from "./blocks-library";
import { BlocksPalette } from "./blocks-palette";
import { blockFromPayload, readPayload, type BlockDragPayload } from "./blocks-dnd";

export { BLOCK_MIME, type BlockDragPayload } from "./blocks-dnd";

interface BlocksPanelProps {
  campaignId: string;
  noteId: string | null;
  /** "note" ou templateId — les blocs existent pour les deux (macro sur fiche). */
  noteType: string;
  initialBlocks: NoteBlock[];
  /** Le MJ édite ; le joueur ne reçoit que les blocs non-gm, en lecture seule. */
  isGM: boolean;
  /** Toutes les notes de la campagne (select « Source » des macros). */
  notes: { id: string; title: string; type: string }[];
  /** Bibliothèque de campagne (filtrée `gm` côté serveur pour les joueurs). */
  library: NoteBlock[];
}

const PANEL_ATTRS = {
  id: "panel-blocks",
  role: "tabpanel",
  "aria-labelledby": "tab-blocks",
} as const;

/**
 * Sous-onglets « Blocs » (métadonnées de la note) / « Bibliothèque »
 * (favoris + blocs custom de campagne), sans bouton Ajouter/Enregistrer :
 * ajout par glisser-déposer, sauvegarde automatique (motif autosave wiki-app).
 * Remonté avec `key={noteId}` par WikiApp → l'état suit la note active.
 */
export function BlocksPanel({
  campaignId,
  noteId,
  noteType,
  initialBlocks,
  isGM,
  notes,
  library,
}: BlocksPanelProps) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [lib, setLib] = useState(library);
  const [sub, setSub] = useState<SubTab>("blocs");
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [libOver, setLibOver] = useState(false);
  const save = useBlocksAutosave(campaignId, noteId);
  const { scopeOf, evalMacro } = useBlockScopes({ campaignId, noteId, noteType, isGM, blocks });
  const { roll, last, error: diceError } = useDiceRoll(campaignId);
  const { rollResult, rollBlock } = createRollHelpers({ roll, last, error: diceError, scopeOf });

  // Le hook gère pending/timer/statut ; on rattache l'état local de la liste.
  const scheduleBlocks = (next: NoteBlock[]) => {
    setBlocks(next);
    save.scheduleBlocks(next);
  };
  const scheduleLib = (next: NoteBlock[]) => {
    setLib(next);
    save.scheduleLib(next);
  };
  /** Ajout depuis la palette (clic) — le glisser est géré par la liste. */
  const pickBlock = (p: BlockDragPayload) => scheduleBlocks([...blocks, blockFromPayload(p)]);

  /** Drop sur un sous-onglet (la cible n'est visible qu'après la bascule au
   *  survol) : ajoute le bloc à la liste, ou le sauvegarde en favori. */
  const handleTabDrop = (e: React.DragEvent, target: SubTab) => {
    const p = readPayload(e);
    if (!p || !isGM) return;
    e.preventDefault();
    setSub(target);
    setDragOver(null);
    if (target === "blocs") scheduleBlocks([...blocks, blockFromPayload(p)]);
    else if (typeof p.index === "number") scheduleLib([...lib, blockFromPayload(p)]);
  };

  if (!noteId) {
    return (
      <div {...PANEL_ATTRS} className="flex-1 overflow-y-auto p-3">
        <p className="text-xs text-muted">Aucune note sélectionnée.</p>
      </div>
    );
  }

  return (
    <div {...PANEL_ATTRS} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <BlocksSubTabs sub={sub} setSub={setSub} isGM={isGM} onDrop={handleTabDrop} />

      {/* Les deux panneaux restent montés (l'inactif en hidden) : démonter la
          source d'un drag en cours l'annule, ce qui cassait le passage
          Bibliothèque → Blocs au survol de l'onglet. */}
      <div
        id="spanel-blocs"
        role="tabpanel"
        aria-labelledby="stab-blocs"
        className={sub === "blocs" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}
      >
        {isGM && <BlocksPalette lib={lib} onPick={pickBlock} />}
        {isGM ? (
          <BlocksEditableList
            isGM={isGM}
            blocks={blocks}
            dragOver={dragOver}
            setDragOver={setDragOver}
            scheduleBlocks={scheduleBlocks}
            notes={notes}
            noteType={noteType}
            noteId={noteId}
            evalMacro={evalMacro}
            scopeOf={scopeOf}
            rollBlock={rollBlock}
            rollResult={rollResult}
          />
        ) : (
          <BlocksReadOnlyList
            blocks={blocks}
            evalMacro={evalMacro}
            scopeOf={scopeOf}
            rollBlock={rollBlock}
            rollResult={rollResult}
          />
        )}
      </div>

      <div
        id="spanel-biblio"
        role="tabpanel"
        aria-labelledby="stab-biblio"
        className={sub === "biblio" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}
      >
        <BlocksLibrary
          isGM={isGM}
          blocks={blocks}
          lib={lib}
          libOver={libOver}
          setLibOver={setLibOver}
          scheduleBlocks={scheduleBlocks}
          scheduleLib={scheduleLib}
        />
      </div>

      {/* Statut autosave (aria-live) : plus de bouton Enregistrer. */}
      {isGM && (
        <div className="border-t border-border p-2" aria-live="polite">
          <span
            className={`text-[0.65rem] ${save.status === "error" ? "text-destructive" : "text-muted"}`}
          >
            {save.statusLabel}
          </span>
        </div>
      )}
    </div>
  );
}
