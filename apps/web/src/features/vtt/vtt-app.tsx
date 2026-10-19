"use client";

import { useEffect, useRef } from "react";
import { useVttActions } from "./use-vtt-actions";
import { useVttBridge } from "./bridge";
import { createVttScene } from "./scene";
import { useVttSocket } from "./socket";
import { useVttState } from "./state";
import { useVttApiSync } from "./sync";
import { VttStage } from "./stage";
import { VttToolbars } from "./toolbars";
import type { VttApi, VttAppProps } from "./types";

export type { VttTool, GridType, GridSettings, TokenState, WallLine } from "./types";

/**
 * Table de jeu — orchestration React : état de scène, sync Socket.io
 * (`scene:state` / `scene:commit`), barres d'outils et canvas PixiJS.
 * Le rendu Pixi vit dans `scene.ts` (liaison via `VttBridge`).
 */
export function VttApp({ isGM, campaignId, initialScene = null }: VttAppProps) {
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
    apply: {
      setTokens: st.setTokens,
      setWalls: st.setWalls,
      setGrid: st.setGrid,
      setMapUrl: st.setMapUrl,
      setFogOn: st.setFogOn,
      setSightCells: st.setSightCells,
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
    isGM,
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
    isGM,
    setTokens: st.setTokens,
    setSelectedId: st.setSelectedId,
    setWalls: st.setWalls,
    setDraftCount: st.setDraftCount,
    setZoom: st.setZoom,
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
        objectUrlRef={objectUrlRef}
        onFileChange={onFileChange}
        setGridNum={setGridNum}
        updateToken={updateToken}
        setTokenNum={setTokenNum}
        deleteToken={deleteToken}
        apiRef={apiRef}
      />
      <VttStage tool={st.tool} containerRef={containerRef} />
    </div>
  );
}
