import type { GridSettings, TokenState, WallLine } from "./types";

/** État de scène mémorisé : tout ce qui est persisté, hors sélection/outil/zoom. */
export interface SceneSnapshot {
  tokens: TokenState[];
  walls: WallLine[];
  grid: GridSettings;
  mapUrl: string | null;
  fogOn: boolean;
  sightCells: number;
}

/** Piles immuables d'annulation / rétablissement, par table. */
export interface VttHistory {
  undo: SceneSnapshot[];
  redo: SceneSnapshot[];
}

/** Profondeur maximale : la plus ancienne entrée disparaît. */
export const HISTORY_LIMIT = 30;

/**
 * Enregistre l'état d'avant une rafale. Toute nouvelle action invalide le
 * rétablissement (on ne peut pas rejouer une branche abandonnée).
 */
export function recordHistory(history: VttHistory, before: SceneSnapshot): VttHistory {
  const undo = [...history.undo, before];
  return {
    undo: undo.length > HISTORY_LIMIT ? undo.slice(undo.length - HISTORY_LIMIT) : undo,
    redo: [],
  };
}

export interface HistoryStep {
  history: VttHistory;
  snapshot: SceneSnapshot;
}

/** Dépile l'état d'avant la dernière action ; null si la pile est vide. */
export function undoHistory(history: VttHistory, current: SceneSnapshot): HistoryStep | null {
  const snapshot = history.undo[history.undo.length - 1];
  if (!snapshot) return null;
  return {
    history: {
      undo: history.undo.slice(0, -1),
      redo: [...history.redo, current],
    },
    snapshot,
  };
}

/** Dépile l'état d'avant l'annulation ; null si rien à rétablir. */
export function redoHistory(history: VttHistory, current: SceneSnapshot): HistoryStep | null {
  const snapshot = history.redo[history.redo.length - 1];
  if (!snapshot) return null;
  return {
    history: {
      undo: [...history.undo, current],
      redo: history.redo.slice(0, -1),
    },
    snapshot,
  };
}

/** JSON à clés triées : un écho WebSocket est égal à l'état local malgré l'ordre. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : v,
  );
}

/** Égalité de contenu : les mises à jour reçues créent des objets neufs identiques. */
export function sameScene(a: SceneSnapshot, b: SceneSnapshot): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
