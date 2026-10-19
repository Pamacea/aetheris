"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ambianceStateSchema, type AmbianceState, type Playlist } from "@aetheris/shared";
import { useCampaignSocket } from "@/lib/use-campaign-socket";
import { saveAmbianceState } from "./actions";
import { DEFAULT_LOCAL_VOLUME, readLocalVolume, subscribeLocalVolume } from "./ambiance-volumes";
import { clampTrackIndex, stepTrackIndex } from "./track-logic";

/**
 * État partagé de l'ambiance : persistance MJ + relayage temps réel
 * (`ambiance:state`), invalidation des listes (`ambiance:playlists-changed`),
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
  const trackIndex = playlist ? clampTrackIndex(state.trackIndex, playlist.tracks.length) : 0;
  const track = playlist?.tracks[trackIndex] ?? null;

  /** Persiste (MJ) puis relaie dans la room ; rollback local si échec. */
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
    socket.emit("ambiance:state", { campaignId, state: next });
  }

  /** Après une mutation de playlist : les autres clients rechargent leur vue server. */
  function broadcastChanged(): void {
    socket.emit("ambiance:playlists-changed", { campaignId });
  }

  // Sync entrante : état relayé + listes rafraîchies + activation de scène.
  useEffect(() => {
    const onState = (payload: { campaignId: string; state: AmbianceState }) => {
      if (payload.campaignId !== campaignId) return;
      const parsed = ambianceStateSchema.safeParse(payload.state);
      if (parsed.success) setState(parsed.data);
    };
    const onChanged = (payload: { campaignId: string }) => {
      if (payload.campaignId !== campaignId) return;
      router.refresh();
    };
    // Activation d'une scène (VTT du MJ) : démarre la playlist associée.
    // shortcut: exige un onglet MJ ouvert sur cette page pour diffuser l'état,
    //           un déclenchement serveur suffira si les scènes se multiplient.
    const onScene = () => {
      const cur = stateRef.current;
      if (!isGM || !cur.playlistId || cur.playing) return;
      void commit({ ...cur, playing: true });
    };
    socket.on("ambiance:state", onState);
    socket.on("ambiance:playlists-changed", onChanged);
    socket.on("scene:change", onScene);
    return () => {
      socket.off("ambiance:state", onState);
      socket.off("ambiance:playlists-changed", onChanged);
      socket.off("scene:change", onScene);
    };
    // commit est stable (stateRef + socket + setState).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, campaignId, isGM, router]);

  function jump(delta: number): void {
    if (!playlist || playlist.tracks.length === 0) return;
    void commit({
      ...state,
      trackIndex: stepTrackIndex(trackIndex, delta, playlist.tracks.length),
    });
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
