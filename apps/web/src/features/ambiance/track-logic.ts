import type { AudioTrack } from "@aetheris/shared";

/** Plafond de pistes par playlist (même borne que `audioTrackSchema`). */
export const MAX_TRACKS = 100;

/** Index courant borné dans la playlist (couvre une piste supprimée en lecture). */
export function clampTrackIndex(index: number, trackCount: number): number {
  if (trackCount <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), trackCount - 1);
}

/** Prev/next avec wrap-around ; playlist vide → 0. */
export function stepTrackIndex(index: number, delta: number, trackCount: number): number {
  if (trackCount <= 0) return 0;
  const current = clampTrackIndex(index, trackCount);
  return (((current + delta) % trackCount) + trackCount) % trackCount;
}

/** Ajout de piste ; null si le plafond est atteint (aucune mutation du tableau d'origine). */
export function appendTrack(tracks: AudioTrack[], track: AudioTrack): AudioTrack[] | null {
  if (tracks.length >= MAX_TRACKS) return null;
  return [...tracks, track];
}

/** Suppression par index ; hors bornes → liste inchangée. */
export function removeTrackAt(tracks: AudioTrack[], index: number): AudioTrack[] {
  if (index < 0 || index >= tracks.length) return tracks;
  return tracks.filter((_, i) => i !== index);
}
