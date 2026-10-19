"use client";

import { useMemo } from "react";
import type { VttBridge } from "./vtt-app-types";

/**
 * Setters + refs (tous stables) gelés dans un objet mémoïsé — la scène Pixi
 * n'en verra que celui-là (l'effet de montage ne se relance jamais).
 */
export function useVttBridge(parts: VttBridge): VttBridge {
  const {
    apiRef,
    toolRef,
    wsRef,
    settingsRef,
    setTokens,
    setSelectedId,
    setWalls,
    setDraftCount,
    setZoom,
    setFicheTokenId,
    setLoreNoteId,
  } = parts;
  return useMemo(
    () => ({
      apiRef,
      toolRef,
      wsRef,
      settingsRef,
      setTokens,
      setSelectedId,
      setWalls,
      setDraftCount,
      setZoom,
      setFicheTokenId,
      setLoreNoteId,
    }),
    [
      apiRef,
      toolRef,
      wsRef,
      settingsRef,
      setTokens,
      setSelectedId,
      setWalls,
      setDraftCount,
      setZoom,
      setFicheTokenId,
      setLoreNoteId,
    ],
  );
}
