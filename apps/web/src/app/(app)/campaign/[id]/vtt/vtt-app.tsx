"use client";

import { useEffect, useRef } from "react";
import { useVttActions } from "./vtt-app-actions";
import { VttBoard } from "./vtt-app-board";
import { useVttBridge } from "./vtt-app-bridge";
import { createVttScene } from "./vtt-app-scene";
import { useVttSocket } from "./vtt-app-socket";
import { useVttState } from "./vtt-app-state";
import { useVttApiSync } from "./vtt-app-sync";
import { VttToolbars } from "./vtt-app-toolbars";
import type { VttApi, VttAppProps } from "./vtt-app-types";

export type { VttTool, GridType, GridSettings, TokenState, WallLine } from "./vtt-app-types";

/**
 * Table de jeu — orchestration React : état de scène, sync Socket.io
 * (`scene:state` / `scene:commit`), barres d'outils et canvas PixiJS.
 * Le rendu Pixi vit dans `vtt-app-scene.ts` (liaison via `VttBridge`).
 */
export function VttApp({ isGM, campaignId, initialScene = null, notes, modals }: VttAppProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<VttApi | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const st = useVttState(initialScene);

  const { wsRef } = useVttSocket({
    campaignId,
    isGM,
    grid: st.grid,
    mapUrl: st.mapUrl,
    tokens: st.tokens,
    walls: st.walls,
    fogOn: st.fogOn,
    sightCells: st.sightCells,
    theatreNotes: st.theatreNotes,
    apply: {
      setTokens: st.setTokens,
      setWalls: st.setWalls,
      setGrid: st.setGrid,
      setMapUrl: st.setMapUrl,
      setFogOn: st.setFogOn,
      setSightCells: st.setSightCells,
      setTheatreNotes: st.setTheatreNotes,
    },
  });

  const { settingsRef, toolRef } = useVttApiSync({
    tool: st.tool,
    apiRef,
    grid: st.grid,
    mapUrl: st.mapUrl,
    tokens: st.tokens,
    selectedId: st.selectedId,
    walls: st.walls,
    fogOn: st.fogOn,
    sightCells: st.sightCells,
  });

  const { onFileChange, setGridNum, updateToken, deleteToken, setTokenNum } = useVttActions({
    tool: st.tool,
    apiRef,
    objectUrlRef,
    selectedId: st.selectedId,
    setGrid: st.setGrid,
    setMapUrl: st.setMapUrl,
    setTokens: st.setTokens,
    setSelectedId: st.setSelectedId,
  });

  const bridge = useVttBridge({
    apiRef,
    toolRef,
    wsRef,
    settingsRef,
    setTokens: st.setTokens,
    setSelectedId: st.setSelectedId,
    setWalls: st.setWalls,
    setDraftCount: st.setDraftCount,
    setZoom: st.setZoom,
    setFicheTokenId: st.setFicheTokenId,
    setLoreNoteId: st.setLoreNoteId,
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
        modals={modals}
        campaignId={campaignId}
        notes={notes}
        objectUrlRef={objectUrlRef}
        onFileChange={onFileChange}
        setGridNum={setGridNum}
        updateToken={updateToken}
        setTokenNum={setTokenNum}
        deleteToken={deleteToken}
        apiRef={apiRef}
      />

      <VttBoard
        st={st}
        isGM={isGM}
        campaignId={campaignId}
        notes={notes}
        containerRef={containerRef}
        apiRef={apiRef}
      />
    </div>
  );
}
