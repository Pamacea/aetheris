"use client";

import { useEffect, useRef } from "react";
import type { GridSettings, TokenState, VttApi, VttSettings, VttTool, WallLine } from "./types";

interface VttSyncParams {
  tool: VttTool;
  apiRef: { current: VttApi | null };
  grid: GridSettings;
  mapUrl: string | null;
  tokens: TokenState[];
  selectedId: string | null;
  walls: WallLine[];
  fogOn: boolean;
  sightCells: number;
}

/**
 * Miroir React → Pixi : le ref de réglages reste toujours frais pour l'init
 * asynchrone, chaque changement d'état est rejoué sur l'API Pixi.
 */
export function useVttApiSync({
  tool,
  apiRef,
  grid,
  mapUrl,
  tokens,
  selectedId,
  walls,
  fogOn,
  sightCells,
}: VttSyncParams) {
  // Derniers réglages lus par l'init Pixi (asynchrone) et rejoués si besoin.
  const settingsRef = useRef<VttSettings>({
    grid,
    mapUrl,
    walls,
    fogOn,
    sightCells,
    tokens,
    selectedId,
  });
  useEffect(() => {
    settingsRef.current = { grid, mapUrl, walls, fogOn, sightCells, tokens, selectedId };
  });

  const toolRef = useRef<VttTool>(tool);
  useEffect(() => {
    const prev = toolRef.current;
    toolRef.current = tool;
    // Quitter l'outil Murs abandonne la polyigne en cours.
    if (prev === "wall" && tool !== "wall") apiRef.current?.cancelDraft();
  }, [tool, apiRef]);

  useEffect(() => {
    apiRef.current?.setGrid(grid);
  }, [grid, apiRef]);

  useEffect(() => {
    apiRef.current?.setMap(mapUrl);
  }, [mapUrl, apiRef]);

  useEffect(() => {
    apiRef.current?.setTokens(tokens, selectedId);
  }, [tokens, selectedId, apiRef]);

  useEffect(() => {
    apiRef.current?.setWalls(walls);
  }, [walls, apiRef]);

  useEffect(() => {
    apiRef.current?.setFog(fogOn, sightCells);
  }, [fogOn, sightCells, apiRef]);

  return { settingsRef, toolRef };
}
