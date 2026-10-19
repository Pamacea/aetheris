import type { Dispatch, SetStateAction } from "react";
import { FichePanel } from "./fiche-panel";
import type { TokenState } from "./vtt-app-types";

interface VttFicheProps {
  campaignId: string;
  tokens: TokenState[];
  ficheTokenId: string | null;
  loreNoteId: string | null;
  notes: { id: string; title: string; folder: string | null }[];
  setFicheTokenId: Dispatch<SetStateAction<string | null>>;
  setLoreNoteId: Dispatch<SetStateAction<string | null>>;
}

/**
 * Fiche ouverte (token lié ou note Lore) : rendue EN table ET en mode théâtre —
 * le conteneur de table porte `hidden` en théâtre, sans ce double rendu la fiche
 * serait invisible. Seule branche visible à la fois (théâtre masque la table).
 */
export function VttFiche({
  campaignId,
  tokens,
  ficheTokenId,
  loreNoteId,
  notes,
  setFicheTokenId,
  setLoreNoteId,
}: VttFicheProps) {
  const ficheToken = tokens.find((t) => t.id === ficheTokenId) ?? null;
  return ficheToken?.noteId ? (
    <FichePanel
      key={ficheToken.id}
      campaignId={campaignId}
      entityId={ficheToken.noteId}
      tokenName={ficheToken.name}
      onClose={() => setFicheTokenId(null)}
    />
  ) : loreNoteId ? (
    <FichePanel
      key={loreNoteId}
      campaignId={campaignId}
      entityId={loreNoteId}
      tokenName={notes.find((n) => n.id === loreNoteId)?.title ?? ""}
      onClose={() => setLoreNoteId(null)}
    />
  ) : null;
}
