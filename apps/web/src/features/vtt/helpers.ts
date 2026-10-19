import { resolveColor } from "@/lib/pixi-theme";
import { TOKEN_COLORS, type GridSettings, type TokenState, type VttPoint } from "./types";

/**
 * Lis une var CSS thème → nombre Pixi 0xRRGGBB. `minLum` pour les éléments posés
 * sur la table (toujours #0b0907) : un thème clair serait illisible dessus.
 * shortcut: pas d'observer — un changement de thème s'applique au prochain rebuild/rechargement.
 */
export function cssColor(name: string, fallback: number, minLum = 0): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return resolveColor(raw, fallback, minLum);
}

/** Identifiant de token (UUID natif, repli string si absent). */
export function newTokenId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nouveau token posé sur la table (snappé), taille calée sur la cellule. */
export function newSceneToken(
  g: GridSettings,
  p: VttPoint,
  name: string,
  index: number,
): TokenState {
  const base = g.type !== "none" ? g.size : 64;
  return {
    id: newTokenId(),
    x: p.x,
    y: p.y,
    size: Math.max(24, Math.round(base * 0.9)),
    rot: 0,
    name,
    color: TOKEN_COLORS[index % TOKEN_COLORS.length],
    hp: null,
    hpMax: null,
  };
}
