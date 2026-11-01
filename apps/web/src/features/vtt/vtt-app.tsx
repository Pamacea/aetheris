"use client";

import { useEffect, useRef } from "react";
import { useVttActions } from "./use-vtt-actions";
import { useVttBridge } from "./bridge";
import { createVttScene } from "./scene";
import { useVttHistory } from "./use-vtt-history";
import { useVttSocket } from "./socket";
import { useVttState } from "./state";
import { useVttApiSync } from "./sync";
import { VttStage } from "./stage";
import { VttToolPanels, VttToolbars } from "./toolbars";
import type { VttApi, VttAppProps } from "./types";

export type { VttTool, GridType, GridSettings, TokenState, WallLine } from "./types";

/**
 * Table de jeu — orchestration React : état de scène, sync Socket.io
 * (`scene:state` / `scene:commit`), barres d'outils et canvas PixiJS.
 * Le rendu Pixi vit dans `scene.ts` (liaison via `VttBridge`).
 */
export function VttApp({
  isGM,
  campaignId,
  userId,
  members,
  entities = [],
  initialScene = null,
}: VttAppProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<VttApi | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const st = useVttState(initialScene);

  const { wsRef, connected, remoteSeqRef } = useVttSocket({
    campaignId,
    isGM,
    grid: st.grid,
    mapUrl: st.mapUrl,
    tokens: st.tokens,
    walls: st.walls,
    fogOn: st.fogOn,
    sightCells: st.sightCells,
    entities,
    apply: {
      setTokens: st.setTokens,
      setWalls: st.setWalls,
      setGrid: st.setGrid,
      setMapUrl: st.setMapUrl,
      setFogOn: st.setFogOn,
      setSightCells: st.setSightCells,
    },
  });

  const { undo, redo, canUndo, canRedo } = useVttHistory({
    isGM,
    connected,
    remoteSeqRef,
    scene: {
      tokens: st.tokens,
      walls: st.walls,
      grid: st.grid,
      mapUrl: st.mapUrl,
      fogOn: st.fogOn,
      sightCells: st.sightCells,
    },
    apply: {
      setTokens: st.setTokens,
      setWalls: st.setWalls,
      setGrid: st.setGrid,
      setMapUrl: st.setMapUrl,
      setFogOn: st.setFogOn,
      setSightCells: st.setSightCells,
      setSelectedId: st.setSelectedId,
    },
  });

  const { settingsRef, toolRef } = useVttApiSync({
    tool: st.tool,
    apiRef,
    grid: st.grid,
    // L'aperçu fichier est purement local ; seul `mapUrl` distant est commité.
    mapUrl: st.mapPreview ?? st.mapUrl,
    tokens: st.tokens,
    selectedId: st.selectedId,
    walls: st.walls,
    wallSelection: st.wallSelection,
    fogOn: st.fogOn,
    sightCells: st.sightCells,
  });

  const {
    mapUploadError,
    onFileChange,
    applyMap,
    removeMap,
    setGridNum,
    updateToken,
    deleteToken,
    setTokenNum,
    deleteWallSelection,
  } = useVttActions({
    tool: st.tool,
    isGM,
    apiRef,
    objectUrlRef,
    selectedId: st.selectedId,
    walls: st.walls,
    wallSelection: st.wallSelection,
    wallType: st.wallType,
    setGrid: st.setGrid,
    setMapUrl: st.setMapUrl,
    setMapPreview: st.setMapPreview,
    setTokens: st.setTokens,
    setSelectedId: st.setSelectedId,
    setWalls: st.setWalls,
    setWallSelection: st.setWallSelection,
    undo,
    redo,
  });

  const bridge = useVttBridge({
    apiRef,
    toolRef,
    wsRef,
    settingsRef,
    isGM,
    userId,
    setTokens: st.setTokens,
    setSelectedId: st.setSelectedId,
    setWalls: st.setWalls,
    setDraftCount: st.setDraftCount,
    setZoom: st.setZoom,
    setWallSelection: st.setWallSelection,
  });

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    return createVttScene(host, bridge);
  }, [bridge]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <VttToolbars
        st={st}
        isGM={isGM}
        updateToken={updateToken}
        setTokenNum={setTokenNum}
        deleteToken={deleteToken}
        campaignId={campaignId}
        userId={userId}
        members={members}
        entities={entities}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      <div className="relative flex min-h-0 flex-1">
        <VttStage tool={st.tool} containerRef={containerRef} />
        {/* Table vierge : le premier geste (jeton ou carte) est indiqué. */}
        {st.tokens.length === 0 && !st.mapUrl && !st.mapPreview && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <span className="panel px-4 py-3 text-sm text-muted">
              {isGM
                ? "Table vide — posez un jeton avec l’outil Tokens, ou importez une carte via l’outil Grille."
                : "Le MJ n’a pas encore préparé la scène."}
            </span>
          </p>
        )}
        {/* Options de l'outil actif, flottantes au-dessus de la carte. */}
        <VttToolPanels
          st={st}
          mapUploadError={mapUploadError}
          onFileChange={onFileChange}
          applyMap={applyMap}
          removeMap={removeMap}
          setGridNum={setGridNum}
          deleteWallSelection={deleteWallSelection}
          apiRef={apiRef}
        />
      </div>
    </div>
  );
}
