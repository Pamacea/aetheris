/**
 * Élément audio unique du module Ambiance : créé paresseusement au niveau
 * module, hors de l'arbre React, pour survivre au démontage des composants
 * (changement de module) sans couper la lecture.
 */
let audio: HTMLAudioElement | null = null;

/** Retourne null en SSR (pas de `document`) — les effets ne tournent que côté client. */
export function getAmbianceAudio(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  if (!audio) audio = new Audio();
  return audio;
}
