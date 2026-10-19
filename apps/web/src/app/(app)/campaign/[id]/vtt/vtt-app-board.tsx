import type { RefObject } from "react";
import { VttFiche } from "./vtt-app-fiche";
import type { VttState } from "./vtt-app-state";
import { VttStage } from "./vtt-app-stage";
import { VttTheatre } from "./vtt-app-theatre";
import type { VttApi } from "./vtt-app-types";

interface VttBoardProps {
  /** État complet de la table (`useVttState`) — la fiche n'en lit qu'une partie. */
  st: VttState;
  isGM: boolean;
  campaignId: string;
  notes: { id: string; title: string; folder: string | null }[];
  containerRef: RefObject<HTMLDivElement | null>;
  apiRef: { current: VttApi | null };
}

/** Zone de table (canvas + fiche) et repli Théâtre — un seul des deux affiché. */
export function VttBoard({ st, isGM, campaignId, notes, containerRef, apiRef }: VttBoardProps) {
  const fiche = (
    <VttFiche
      campaignId={campaignId}
      tokens={st.tokens}
      ficheTokenId={st.ficheTokenId}
      loreNoteId={st.loreNoteId}
      notes={notes}
      setFicheTokenId={st.setFicheTokenId}
      setLoreNoteId={st.setLoreNoteId}
    />
  );
  return (
    <>
      <VttStage
        theatre={st.theatre}
        tool={st.tool}
        containerRef={containerRef}
        apiRef={apiRef}
        fiche={fiche}
      />

      {st.theatre && (
        <VttTheatre
          isGM={isGM}
          theatreNotes={st.theatreNotes}
          setTheatreNotes={st.setTheatreNotes}
          setLoreNoteId={st.setLoreNoteId}
          setFicheTokenId={st.setFicheTokenId}
          fiche={fiche}
        />
      )}
    </>
  );
}
