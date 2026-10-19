"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { SceneState, TokenMoved } from "@aetheris/shared";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import type { GridSettings, TokenState, WallLine } from "./vtt-app-types";

interface VttSocketParams {
  campaignId: string;
  isGM: boolean;
  /** État complet de la scène — commit débouncé à chaque changement. */
  grid: GridSettings;
  mapUrl: string | null;
  tokens: TokenState[];
  walls: WallLine[];
  fogOn: boolean;
  sightCells: number;
  theatreNotes: { id: string; title: string }[];
  /** Setters d'état : appliqués en réception, sans re-émission. */
  apply: {
    setTokens: Dispatch<SetStateAction<TokenState[]>>;
    setWalls: Dispatch<SetStateAction<WallLine[]>>;
    setGrid: Dispatch<SetStateAction<GridSettings>>;
    setMapUrl: Dispatch<SetStateAction<string | null>>;
    setFogOn: Dispatch<SetStateAction<boolean>>;
    setSightCells: Dispatch<SetStateAction<number>>;
    setTheatreNotes: Dispatch<SetStateAction<{ id: string; title: string }[]>>;
  };
}

/**
 * Temps réel de la table (Phase 6) : activation de scène au montage (MJ),
 * réceptions appliquées localement sans re-émission, puis commit d'état
 * complet débouncé (persisté + broadcast) — se déclenche aussi à la connexion.
 */
export function useVttSocket({
  campaignId,
  isGM,
  grid,
  mapUrl,
  tokens,
  walls,
  fogOn,
  sightCells,
  theatreNotes,
  apply,
}: VttSocketParams) {
  const { socket, connected } = useCampaignSocket(campaignId);
  /** true pendant l'application d'un état reçu (évite la boucle d'émission). */
  const applyingRemoteRef = useRef(false);
  /** Socket + campagne exposées à la fermeture Pixi (drags en cours). */
  const wsRef = useRef<{ socket: typeof socket; campaignId: string } | null>(null);
  useEffect(() => {
    wsRef.current = connected ? { socket, campaignId } : null;
  }, [socket, connected, campaignId]);

  // Activation de scène au montage (MJ) : `scene:change` part dans la room,
  // un module d'ambiance ouvert peut démarrer la playlist associée.
  useEffect(() => {
    if (!isGM || !connected) return;
    socket.emit("scene:activate", { campaignId });
  }, [isGM, connected, socket, campaignId]);

  // Réceptions : appliquées localement, sans re-émission (flag consommé
  // par l'effet de commit ci-dessous).
  useEffect(() => {
    const onMoved = (p: TokenMoved) => {
      applyingRemoteRef.current = true;
      apply.setTokens((ts) =>
        ts.map((t) => (t.id === p.tokenId ? { ...t, x: p.x, y: p.y, rot: p.rot ?? t.rot } : t)),
      );
    };
    const onState = (state: SceneState) => {
      applyingRemoteRef.current = true;
      apply.setTokens(state.tokens);
      apply.setWalls(state.walls);
      apply.setGrid(state.grid);
      apply.setMapUrl(state.mapUrl);
      apply.setFogOn(state.fog.on);
      apply.setSightCells(state.fog.sightCells);
      apply.setTheatreNotes(state.theatreNotes ?? []); // ?? = serveur en dev pas rechargé
    };
    socket.on("token:moved", onMoved);
    socket.on("scene:state", onState);
    return () => {
      socket.off("token:moved", onMoved);
      socket.off("scene:state", onState);
    };
    // `apply` ne contient que des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Émissions : commit d'état complet débouncé (persisté + broadcast).
  // Se déclenche aussi à la connexion (= resync initial).
  useEffect(() => {
    if (!connected) return;
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      socket.emit("scene:commit", {
        campaignId,
        state: { tokens, walls, grid, mapUrl, fog: { on: fogOn, sightCells }, theatreNotes },
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [connected, socket, campaignId, tokens, walls, grid, mapUrl, fogOn, sightCells, theatreNotes]);

  return { socket, connected, wsRef };
}
