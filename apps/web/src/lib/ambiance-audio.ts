/**
 * Élément audio unique du module Ambiance : créé paresseusement au niveau
 * module, hors de l'arbre React, pour survivre au démontage des composants
 * (re-rendu du bureau VTT) sans couper la lecture.
 */
let audio: HTMLAudioElement | null = null;

/** Retourne null en SSR (pas de `document`) — les effets ne tournent que côté client. */
export function getAmbianceAudio(): HTMLAudioElement | null {
  if (typeof document === "undefined") return null;
  if (!audio) audio = new Audio();
  return audio;
}

/**
 * Coupe la lecture et détache la source. Appelé quand le document du module
 * est détruit (fermeture de la fenêtre / navigation) : certains moteurs
 * continuent de jouer un `<audio>` détaché après suppression de l'iframe.
 */
export function stopAmbianceAudio(): void {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}
