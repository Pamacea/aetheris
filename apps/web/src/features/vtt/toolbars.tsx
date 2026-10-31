import { VttFogBar } from "./fog-bar";
import { VttGridBar } from "./grid-bar";
import { VttSpellBar } from "./spell-bar";
import type { VttState } from "./state";
import { VttTokenHeader } from "./token-header";
import { VttToolbar } from "./toolbar";
import type { TokenState, VttApi, VttEntity, VttMember, WallSelection } from "./types";
import { TOOLS } from "./types";
import { VTT_PANEL_CLS } from "./bars";
import { VttWallBar } from "./wall-bar";

interface VttToolbarsProps {
  /** État complet de la table (`useVttState`) — les barres n'en lisent qu'une partie. */
  st: VttState;
  isGM: boolean;
  updateToken: (id: string, patch: Partial<TokenState>) => void;
  setTokenNum: (id: string, key: "size", raw: string) => void;
  deleteToken: (id: string) => void;
  campaignId: string;
  userId: string;
  members: VttMember[];
  entities: VttEntity[];
}

/** En-tête unique du token sélectionné + barre de sorts + outils (dock). */
export function VttToolbars({
  st,
  isGM,
  updateToken,
  setTokenNum,
  deleteToken,
  campaignId,
  userId,
  members,
  entities,
}: VttToolbarsProps) {
  // Joueur : Curseur + Vue uniquement — tout le reste édite la table (MJ).
  const visibleTools = TOOLS.filter((t) => isGM || !t.gmOnly);
  const selected = st.tokens.find((t) => t.id === st.selectedId) ?? null;
  return (
    <>
      {selected && (
        <VttTokenHeader
          token={selected}
          campaignId={campaignId}
          isGM={isGM}
          userId={userId}
          members={members}
          entities={entities}
          updateToken={updateToken}
          setTokenNum={setTokenNum}
          deleteToken={deleteToken}
        />
      )}

      {selected && (
        <VttSpellBar
          token={selected}
          tokens={st.tokens}
          entities={entities}
          campaignId={campaignId}
          updateToken={updateToken}
        />
      )}

      {/* Barre flottante en bas de la table, au niveau du dock des modules. */}
      <VttToolbar visibleTools={visibleTools} tool={st.tool} setTool={st.setTool} zoom={st.zoom} />
    </>
  );
}

interface VttToolPanelsProps {
  st: VttState;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  applyMap: (raw: string) => boolean;
  removeMap: () => void;
  setGridNum: (key: "size" | "offsetX" | "offsetY", raw: string) => void;
  deleteWallSelection: (selection: WallSelection | null) => void;
  apiRef: { current: VttApi | null };
}

/**
 * Options de l'outil actif, en panneau flottant au coin supérieur gauche de la
 * carte (MJ) : la bande pleine largeur rognait la table et dupliquait les barres.
 */
export function VttToolPanels({
  st,
  onFileChange,
  applyMap,
  removeMap,
  setGridNum,
  deleteWallSelection,
  apiRef,
}: VttToolPanelsProps) {
  const selected = st.tokens.find((t) => t.id === st.selectedId) ?? null;

  let panel: React.ReactNode = null;
  if (st.tool === "grid") {
    panel = (
      <VttGridBar
        grid={st.grid}
        setGrid={st.setGrid}
        setGridNum={setGridNum}
        mapUrl={st.mapUrl}
        mapPreview={st.mapPreview}
        applyMap={applyMap}
        removeMap={removeMap}
        onFileChange={onFileChange}
      />
    );
  } else if (st.tool === "wall") {
    panel = (
      <VttWallBar
        walls={st.walls}
        setWalls={st.setWalls}
        draftCount={st.draftCount}
        apiRef={apiRef}
        wallType={st.wallType}
        setWallType={st.setWallType}
        wallSelection={st.wallSelection}
        deleteWallSelection={deleteWallSelection}
      />
    );
  } else if (st.tool === "fog") {
    panel = (
      <VttFogBar
        fogOn={st.fogOn}
        setFogOn={st.setFogOn}
        sightCells={st.sightCells}
        setSightCells={st.setSightCells}
      />
    );
  } else if (st.tool === "token" && !selected) {
    panel = (
      <div className={VTT_PANEL_CLS}>
        <span className="text-muted">
          Cliquez sur la scène pour placer un token — il se cale sur la grille. Cliquez sur un token
          pour le sélectionner.
        </span>
      </div>
    );
  }

  if (!panel) return null;
  return (
    <div className="pointer-events-none absolute top-2 left-2 z-20 max-w-[calc(100%-1rem)]">
      {panel}
    </div>
  );
}
