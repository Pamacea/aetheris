"use client";

import { useEffect, useRef, useState } from "react";
import type { AmbianceState, AudioTrack, Playlist } from "@aetheris/shared";
import { getAmbianceAudio } from "@/lib/ambiance-audio";

/**
 * Lecteur audio HTML5 (singleton partagé, survit au démontage) :
 * lecture synchronisée, volume local × global, fin de piste.
 */
export function useAmbianceAudio({
  state,
  playlist,
  track,
  trackIndex,
  isGM,
  localVolume,
  commit,
}: {
  state: AmbianceState;
  playlist: Playlist | null;
  track: AudioTrack | null;
  trackIndex: number;
  isGM: boolean;
  localVolume: number;
  commit: (next: AmbianceState) => Promise<void>;
}) {
  const [blocked, setBlocked] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);

  /** Handler `ended` courant, lu par le listener unique du singleton audio. */
  const onEndedRef = useRef<() => void>(() => {});

  // ── Lecteur audio HTML5 ───────────────────────────────────────────
  // Déclaré AVANT les effets de lecture : les listeners sont posés au montage
  // avant tout play(). Détachement au démontage sans pause() — la lecture
  // continue en arrière-plan après fermeture de la modale VTT.
  useEffect(() => {
    const a = getAmbianceAudio();
    if (!a) return;
    const onPlay = () => setLocalPlaying(true);
    const onPause = () => setLocalPlaying(false);
    const ended = () => onEndedRef.current();
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", ended);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", ended);
    };
  }, []);

  useEffect(() => {
    const a = getAmbianceAudio();
    if (!a) return;
    const url = track?.url ?? "";
    // src lu sur l'élément : deux instances montées partagent le même élément.
    if ((a.getAttribute("src") ?? "") === url) return;
    if (url) a.src = url;
    else a.removeAttribute("src");
  }, [track?.url]);

  useEffect(() => {
    const a = getAmbianceAudio();
    if (!a) return;
    if (state.playing && track) {
      void a
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    } else {
      a.pause();
    }
  }, [state.playing, track?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Volume effectif = local × global (borné 0-1) + boucle pilotée par le MJ.
  useEffect(() => {
    const a = getAmbianceAudio();
    if (!a) return;
    a.volume = Math.min(1, Math.max(0, localVolume * state.volume));
    a.loop = state.loop;
  }, [localVolume, state.volume, state.loop]);

  /** Fin de piste : le MJ enchaîne (les joueurs suivent le broadcast). */
  function onEnded(): void {
    const a = getAmbianceAudio();
    if (!a || !state.playing) return;
    if (!playlist || playlist.tracks.length <= 1) {
      // Piste unique : boucle locale, aucun changement d'état à diffuser.
      a.currentTime = 0;
      void a.play().catch(() => setBlocked(true));
      return;
    }
    if (isGM) {
      void commit({
        ...state,
        trackIndex: (trackIndex + 1) % playlist.tracks.length,
      });
    }
    // Joueurs : relance au prochain broadcast du MJ.
  }

  // Anti-staleness : le listener `ended` du singleton lit la version courante.
  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  function toggle(): void {
    if (isGM) {
      void commit({ ...state, playing: !state.playing });
      return;
    }
    // Joueur : transport local (le MJ garde la synchro d'état).
    const a = getAmbianceAudio();
    if (!a || !track) return;
    if (a.paused)
      void a
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    else a.pause();
  }

  /** Débloque la lecture après le geste utilisateur requis par le navigateur. */
  function unblock(): void {
    void getAmbianceAudio()
      ?.play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  }

  return { blocked, localPlaying, toggle, unblock };
}
