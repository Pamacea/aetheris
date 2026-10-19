import { VttFogBar } from "./vtt-app-fog-bar";
import { VttGridBar } from "./vtt-app-grid-bar";
import type { VttState } from "./vtt-app-state";
import { VttTokenBar } from "./vtt-app-token-bar";
import { VttToolbar } from "./vtt-app-toolbar";
import type { TokenState, VttApi } from "./vtt-app-types";
import { TOOLS } from "./vtt-app-types";
import { VttWallBar } from "./vtt-app-wall-bar";
import type { VttModalsProps } from "./vtt-modals";

interface VttToolbarsProps {
  /** État complet de la table (`useVttState`) — les barres n'en lisent qu'une partie. */
  st: VttState;
  isGM: boolean;
  modals?: VttModalsProps;
  campaignId: string;
  notes: { id: string; title: string; folder: string | null }[];
  objectUrlRef: { current: string | null };
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setGridNum: (key: "size" | "offsetX" | "offsetY", raw: string) => void;
  updateToken: (id: string, patch: Partial<TokenState>) => void;
  setTokenNum: (id: string, key: "size" | "rot" | "hp" | "hpMax", raw: string) => void;
  deleteToken: (id: string) => void;
  apiRef: { current: VttApi | null };
}

/** Barre d'outils + barre d'outil active (Grille/Tokens/Murs/Brouillard), masquées en théâtre. */
export function VttToolbars({
  st,
  isGM,
  modals,
  campaignId,
  notes,
  objectUrlRef,
  onFileChange,
  setGridNum,
  updateToken,
  setTokenNum,
  deleteToken,
  apiRef,
}: VttToolbarsProps) {
  const visibleTools = TOOLS.filter((t) => isGM || !t.gmOnly);
  const activeTool = visibleTools.find((t) => t.id === st.tool) ?? visibleTools[0];
  const selected = st.tokens.find((t) => t.id === st.selectedId) ?? null;
  return (
    <>
      <VttToolbar
        visibleTools={visibleTools}
        tool={st.tool}
        setTool={st.setTool}
        theatre={st.theatre}
        setTheatre={st.setTheatre}
        modals={modals}
        activeHint={activeTool?.hint}
        zoom={st.zoom}
      />

      {st.tool === "grid" && !st.theatre && (
        <VttGridBar
          grid={st.grid}
          setGrid={st.setGrid}
          setGridNum={setGridNum}
          mapUrl={st.mapUrl}
          setMapUrl={st.setMapUrl}
          objectUrlRef={objectUrlRef}
          onFileChange={onFileChange}
        />
      )}

      {st.tool === "token" && !st.theatre && (
        <VttTokenBar
          selected={selected}
          campaignId={campaignId}
          isGM={isGM}
          notes={notes}
          updateToken={updateToken}
          setTokenNum={setTokenNum}
          deleteToken={deleteToken}
          setFicheTokenId={st.setFicheTokenId}
        />
      )}

      {st.tool === "wall" && !st.theatre && (
        <VttWallBar
          walls={st.walls}
          setWalls={st.setWalls}
          draftCount={st.draftCount}
          apiRef={apiRef}
        />
      )}

      {st.tool === "fog" && !st.theatre && (
        <VttFogBar
          fogOn={st.fogOn}
          setFogOn={st.setFogOn}
          sightCells={st.sightCells}
          setSightCells={st.setSightCells}
        />
      )}
    </>
  );
}
