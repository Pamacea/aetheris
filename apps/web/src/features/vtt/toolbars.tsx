import { VttFogBar } from "./fog-bar";
import { VttGridBar } from "./grid-bar";
import type { VttState } from "./state";
import { VttTokenBar } from "./token-bar";
import { VttToolbar } from "./toolbar";
import type { TokenState, VttApi } from "./types";
import { TOOLS } from "./types";
import { VttWallBar } from "./wall-bar";

interface VttToolbarsProps {
  /** État complet de la table (`useVttState`) — les barres n'en lisent qu'une partie. */
  st: VttState;
  isGM: boolean;
  objectUrlRef: { current: string | null };
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setGridNum: (key: "size" | "offsetX" | "offsetY", raw: string) => void;
  updateToken: (id: string, patch: Partial<TokenState>) => void;
  setTokenNum: (id: string, key: "size", raw: string) => void;
  deleteToken: (id: string) => void;
  apiRef: { current: VttApi | null };
}

/** Barre d'outils + barre d'outil active (Grille/Tokens/Murs/Brouillard), tous MJ. */
export function VttToolbars({
  st,
  isGM,
  objectUrlRef,
  onFileChange,
  setGridNum,
  updateToken,
  setTokenNum,
  deleteToken,
  apiRef,
}: VttToolbarsProps) {
  // Joueur : Curseur + Vue uniquement — tout le reste édite la table (MJ).
  const visibleTools = TOOLS.filter((t) => isGM || !t.gmOnly);
  const activeTool = visibleTools.find((t) => t.id === st.tool) ?? visibleTools[0];
  const selected = st.tokens.find((t) => t.id === st.selectedId) ?? null;
  return (
    <>
      <VttToolbar
        visibleTools={visibleTools}
        tool={st.tool}
        setTool={st.setTool}
        activeHint={activeTool?.hint}
        zoom={st.zoom}
      />

      {st.tool === "grid" && (
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

      {st.tool === "token" && (
        <VttTokenBar
          selected={selected}
          updateToken={updateToken}
          setTokenNum={setTokenNum}
          deleteToken={deleteToken}
        />
      )}

      {st.tool === "wall" && (
        <VttWallBar
          walls={st.walls}
          setWalls={st.setWalls}
          draftCount={st.draftCount}
          apiRef={apiRef}
        />
      )}

      {st.tool === "fog" && (
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
