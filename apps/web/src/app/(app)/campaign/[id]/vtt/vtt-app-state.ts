"use client";

import type { SceneState } from "@aetheris/shared";
import { useEffect, useState } from "react";
import { OPEN_NOTE_EVENT } from "./notes-palette";
import type { GridSettings, TokenState, VttTool, WallLine } from "./vtt-app-types";

/**
 * État React de la table (outils, scène, fiche) — les mêmes `useState` qu'auparavant,
 * extraits pour garder `VttApp` court. L'écoute `OPEN_NOTE` vit ici : l'ordre des
 * effets reste identique (elle doit passer avant l'effet de montage de la scène).
 */
export function useVttState(initialScene: SceneState | null | undefined) {
  const [tool, setTool] = useState<VttTool>("select");
  /** Repli Theatre of the Mind : masque la table, chat/dés restent actifs. */
  const [theatre, setTheatre] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [grid, setGrid] = useState<GridSettings>(
    initialScene?.grid ?? { type: "square", size: 64, offsetX: 0, offsetY: 0 },
  );
  const [mapUrl, setMapUrl] = useState<string | null>(initialScene?.mapUrl ?? null);
  const [tokens, setTokens] = useState<TokenState[]>(initialScene?.tokens ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Token dont la fiche (Entity liée) est ouverte dans le panneau latéral. */
  const [ficheTokenId, setFicheTokenId] = useState<string | null>(null);
  /** Note ouverte depuis la palette Lore (panneau latéral, hors token). */
  const [loreNoteId, setLoreNoteId] = useState<string | null>(null);
  const [walls, setWalls] = useState<WallLine[]>(initialScene?.walls ?? []);
  const [fogOn, setFogOn] = useState(initialScene?.fog.on ?? false);
  const [sightCells, setSightCells] = useState(initialScene?.fog.sightCells ?? 10);
  const [draftCount, setDraftCount] = useState(0);
  /** Notes posées dans le mode Théâtre (état de scène : persisté + broadcast). */
  const [theatreNotes, setTheatreNotes] = useState<{ id: string; title: string }[]>(
    initialScene?.theatreNotes ?? [],
  );

  // La palette est montée par page.tsx (Server Component) : signal par évènement fenêtre.
  useEffect(() => {
    const onOpen = (e: Event) => {
      setLoreNoteId((e as CustomEvent<string>).detail);
      setFicheTokenId(null);
    };
    window.addEventListener(OPEN_NOTE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NOTE_EVENT, onOpen);
  }, []);

  return {
    tool,
    setTool,
    theatre,
    setTheatre,
    zoom,
    setZoom,
    grid,
    setGrid,
    mapUrl,
    setMapUrl,
    tokens,
    setTokens,
    selectedId,
    setSelectedId,
    ficheTokenId,
    setFicheTokenId,
    loreNoteId,
    setLoreNoteId,
    walls,
    setWalls,
    fogOn,
    setFogOn,
    sightCells,
    setSightCells,
    draftCount,
    setDraftCount,
    theatreNotes,
    setTheatreNotes,
  };
}

/** Forme complète de l'état — partagée aux composants qui n'en lisent qu'une partie. */
export type VttState = ReturnType<typeof useVttState>;
