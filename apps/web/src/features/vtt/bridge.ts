"use client";

import { useMemo } from "react";
import type { VttBridge } from "./types";

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
    isGM,
    setTokens,
    setSelectedId,
    setWalls,
    setDraftCount,
    setZoom,
  } = parts;
  return useMemo(
    () => ({
      apiRef,
      toolRef,
      wsRef,
      settingsRef,
      isGM,
      setTokens,
      setSelectedId,
      setWalls,
      setDraftCount,
      setZoom,
    }),
    [
      apiRef,
      toolRef,
      wsRef,
      settingsRef,
      isGM,
      setTokens,
      setSelectedId,
      setWalls,
      setDraftCount,
      setZoom,
    ],
  );
}
