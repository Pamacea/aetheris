"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AMBIANCE_CHANGED_EVENT,
  AMBIANCE_STATE_EVENT,
  ambianceStateSchema,
  type AmbianceState,
  type Playlist,
  type PluginEvent,
} from "@aetheris/shared";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { saveAmbianceState } from "./actions";
import { DEFAULT_LOCAL_VOLUME, readLocalVolume, subscribeLocalVolume } from "./ambiance-volumes";

/**
 * État partagé de l'ambiance : persistance MJ + relayage temps réel,
 * dérivés (playlist/piste) et transport piloté par le MJ.
 */
export function useAmbiance(
  campaignId: string,
  initialState: AmbianceState,
  playlists: Playlist[],
  isGM: boolean,
) {
  const router = useRouter();
  const { socket } = useCampaignSocket(campaignId);
  const [state, setState] = useState<AmbianceState>(initialState);
  /** État courant lu dans les handlers à vie longue (anti-staleness). */
  const stateRef = useRef(initialState);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [error, setError] = useState<string | null>(null);
  /** Volume personnel du client (jamais broadcast) — snapshot localStorage. */
  const localVolume = useSyncExternalStore(
    subscribeLocalVolume,
    readLocalVolume,
    () => DEFAULT_LOCAL_VOLUME,
  );

  const playlist = playlists.find((p) => p.id === state.playlistId) ?? null;
  // Index dérivé : couvre une piste supprimée pendant la lecture.
  const trackIndex = playlist
    ? Math.min(state.trackIndex, Math.max(0, playlist.tracks.length - 1))
    : 0;
  const track = playlist?.tracks[trackIndex] ?? null;

  /** Persiste (MJ) puis broadcast ; rollback local si la persistance échoue. */
  async function commit(next: AmbianceState): Promise<void> {
    const prev = stateRef.current;
    stateRef.current = next;
    setState(next);
    setError(null);
    const res = await saveAmbianceState(campaignId, next);
    if (!res.ok) {
      setError(res.error);
      stateRef.current = prev;
      setState(prev);
      return;
    }
    socket.emit("plugin:event", {
      campaignId,
      pluginId: "ambiance",
      type: AMBIANCE_STATE_EVENT,
      payload: next,
    });
  }

  /** Après une mutation de playlist : les vues server rechargent leur liste. */
  function broadcastChanged(): void {
    socket.emit("plugin:event", {
      campaignId,
      pluginId: "ambiance",
      type: AMBIANCE_CHANGED_EVENT,
      payload: null,
    });
    router.refresh();
  }

  // Sync entrante : état relayé + listes rafraîchies + activation de scène.
  useEffect(() => {
    const onPlugin = (ev: PluginEvent) => {
      if (ev.pluginId !== "ambiance") return;
      if (ev.type === AMBIANCE_STATE_EVENT) {
        const parsed = ambianceStateSchema.safeParse(ev.payload);
        if (parsed.success) setState(parsed.data);
      } else if (ev.type === AMBIANCE_CHANGED_EVENT) {
        router.refresh();
      }
    };
    // Activation d'une scène (VTT du MJ) : démarre la playlist associée.
    // shortcut: exige un onglet MJ ouvert sur cette page pour diffuser l'état,
    //           un déclenchement serveur suffira si les scènes se multiplient.
    const onScene = () => {
      const cur = stateRef.current;
      if (!isGM || !cur.playlistId || cur.playing) return;
      void commit({ ...cur, playing: true });
    };
    socket.on("plugin:event", onPlugin);
    socket.on("scene:change", onScene);
    return () => {
      socket.off("plugin:event", onPlugin);
      socket.off("scene:change", onScene);
    };
    // commit est stable (stateRef + socket + setState).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isGM, router, campaignId]);

  function jump(delta: number): void {
    if (!playlist || playlist.tracks.length === 0) return;
    const next = (trackIndex + delta + playlist.tracks.length) % playlist.tracks.length;
    void commit({ ...state, trackIndex: next });
  }

  /** Associe (ou retire) la playlist de la scène — lecture stoppée. */
  function selectScenePlaylist(id: string): void {
    void commit({
      ...state,
      playlistId: id === "" ? null : id,
      trackIndex: 0,
      playing: false,
    });
  }

  return {
    state,
    stateRef,
    error,
    setError,
    commit,
    broadcastChanged,
    playlist,
    trackIndex,
    track,
    localVolume,
    jump,
    selectScenePlaylist,
  };
}
