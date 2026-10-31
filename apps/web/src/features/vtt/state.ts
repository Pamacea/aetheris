"use client";

import type { SceneState } from "@aetheris/shared";
import { useState } from "react";
import type { GridSettings, TokenState, VttTool, WallLine, WallSelection, WallType } from "./types";

/**
 * État React de la table (outils, scène) — les mêmes `useState` qu'auparavant,
 * extraits pour garder `VttApp` court.
 */
export function useVttState(initialScene: SceneState | null | undefined) {
  const [tool, setTool] = useState<VttTool>("select");
  const [zoom, setZoom] = useState(1);
  const [grid, setGrid] = useState<GridSettings>(
    initialScene?.grid ?? { type: "square", size: 64, offsetX: 0, offsetY: 0 },
  );
  const [mapUrl, setMapUrl] = useState<string | null>(initialScene?.mapUrl ?? null);
  /** Aperçu local d'un fichier : jamais commité ni diffusé (pas d'upload). */
  const [mapPreview, setMapPreview] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenState[]>(initialScene?.tokens ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [walls, setWalls] = useState<WallLine[]>(initialScene?.walls ?? []);
  const [wallSelection, setWallSelection] = useState<WallSelection | null>(null);
  const [wallType, setWallType] = useState<WallType>("wall");
  const [fogOn, setFogOn] = useState(initialScene?.fog.on ?? false);
  const [sightCells, setSightCells] = useState(initialScene?.fog.sightCells ?? 10);
  const [draftCount, setDraftCount] = useState(0);

  return {
    tool,
    setTool,
    zoom,
    setZoom,
    grid,
    setGrid,
    mapUrl,
    setMapUrl,
    mapPreview,
    setMapPreview,
    tokens,
    setTokens,
    selectedId,
    setSelectedId,
    walls,
    setWalls,
    wallSelection,
    setWallSelection,
    wallType,
    setWallType,
    fogOn,
    setFogOn,
    sightCells,
    setSightCells,
    draftCount,
    setDraftCount,
  };
}

/** Forme complète de l'état — partagée aux composants qui n'en lisent qu'une partie. */
export type VttState = ReturnType<typeof useVttState>;
