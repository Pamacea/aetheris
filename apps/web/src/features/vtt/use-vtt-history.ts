"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  recordHistory,
  redoHistory,
  sameScene,
  undoHistory,
  type SceneSnapshot,
  type VttHistory,
} from "./history";
import type { GridSettings, TokenState, WallLine } from "./types";

interface VttHistoryParams {
  isGM: boolean;
  connected: boolean;
  /** Compteur monotone des états distants appliqués (`useVttSocket`). */
  remoteSeqRef: { current: number };
  scene: SceneSnapshot;
  apply: {
    setTokens: Dispatch<SetStateAction<TokenState[]>>;
    setWalls: Dispatch<SetStateAction<WallLine[]>>;
    setGrid: Dispatch<SetStateAction<GridSettings>>;
    setMapUrl: Dispatch<SetStateAction<string | null>>;
    setFogOn: Dispatch<SetStateAction<boolean>>;
    setSightCells: Dispatch<SetStateAction<number>>;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
  };
}

/** Fenêtre de regroupement d'une rafale (drag, saisie numérique, tracé). */
const BURST_DELAY = 400;

/**
 * Historique en mémoire des actions de scène du MJ (plafond 30). Une rafale
 * n'enregistre qu'une entrée, avec l'état d'avant ; les échos WebSocket et la
 * restauration ne créent jamais d'entrée. La persistance reste le commit
 * débouncé de `useVttSocket` : la restauration passe par les mêmes setters.
 */
export function useVttHistory({ isGM, connected, remoteSeqRef, scene, apply }: VttHistoryParams) {
  const [history, setHistory] = useState<VttHistory>({ undo: [], redo: [] });
  const historyRef = useRef(history);
  /** Dernier état enregistré (ou reçu) : base de la prochaine entrée. */
  const baselineRef = useRef<SceneSnapshot>(scene);
  const latestRef = useRef<SceneSnapshot>(scene);
  const pendingBeforeRef = useRef<SceneSnapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dernier compteur distant vu par l'historique (indépendant du commit). */
  const seenRemoteRef = useRef(0);

  const { tokens, walls, grid, mapUrl, fogOn, sightCells } = scene;

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Le timer peut se déclencher entre deux rendus : il lit l'état le plus frais.
  useEffect(() => {
    latestRef.current = scene;
  });

  /**
   * Geste de scène en cours (drag de jeton, tracé de mur) : le serveur renvoie
   * `token:moved` à la room MJ, donc nos propres échos ne doivent pas avancer
   * la base avant le commit local de fin de geste.
   */
  const gestureRef = useRef(false);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (e.button === 0 && e.target instanceof HTMLCanvasElement) gestureRef.current = true;
    };
    const up = () => {
      gestureRef.current = false;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useEffect(() => {
    if (!isGM || !connected) return;

    // Mise à jour distante : jamais enregistrée. Hors rafale ou geste en
    // cours, elle devient la base pour que undo ne l'annule pas.
    if (remoteSeqRef.current !== seenRemoteRef.current) {
      seenRemoteRef.current = remoteSeqRef.current;
      if (timerRef.current === null && !gestureRef.current) {
        baselineRef.current = latestRef.current;
      }
      return;
    }

    // Début de rafale : l'état d'avant est encore la base.
    if (timerRef.current === null) pendingBeforeRef.current = baselineRef.current;
    else clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const before = pendingBeforeRef.current ?? baselineRef.current;
      pendingBeforeRef.current = null;
      const current = latestRef.current;
      // Même contenu = écho de notre commit ou restauration : rien à empiler.
      if (sameScene(before, current)) return;
      baselineRef.current = current;
      setHistory((h) => recordHistory(h, before));
    }, BURST_DELAY);
  }, [isGM, connected, remoteSeqRef, tokens, walls, grid, mapUrl, fogOn, sightCells]);

  // Nettoyage au démontage (le timer n'est pas recréé à chaque rendu).
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const restore = (snapshot: SceneSnapshot) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingBeforeRef.current = null;
    // La restauration est la nouvelle base : l'effet débouncé ne la réenregistre pas.
    baselineRef.current = snapshot;
    latestRef.current = snapshot;
    apply.setTokens(snapshot.tokens);
    apply.setWalls(snapshot.walls);
    apply.setGrid(snapshot.grid);
    apply.setMapUrl(snapshot.mapUrl);
    apply.setFogOn(snapshot.fogOn);
    apply.setSightCells(snapshot.sightCells);
    // Le jeton sélectionné peut avoir disparu de l'instantané restauré.
    apply.setSelectedId(null);
  };

  const undo = (): boolean => {
    if (!isGM) return false;
    const step = undoHistory(historyRef.current, latestRef.current);
    if (!step) return false;
    historyRef.current = step.history;
    setHistory(step.history);
    restore(step.snapshot);
    return true;
  };

  const redo = (): boolean => {
    if (!isGM) return false;
    const step = redoHistory(historyRef.current, latestRef.current);
    if (!step) return false;
    historyRef.current = step.history;
    setHistory(step.history);
    restore(step.snapshot);
    return true;
  };

  return {
    undo,
    redo,
    canUndo: history.undo.length > 0,
    canRedo: history.redo.length > 0,
  };
}
