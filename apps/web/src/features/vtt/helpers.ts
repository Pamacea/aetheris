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

/** Identifiant local (jeton ou mur) : UUID natif, repli string si absent. */
export function newId(): string {
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
    id: newId(),
    x: p.x,
    y: p.y,
    size: Math.max(24, Math.round(base * 0.9)),
    rot: 0,
    name,
    color: TOKEN_COLORS[index % TOKEN_COLORS.length],
    hp: null,
    hpMax: null,
    ac: null,
    ownerId: null,
    noteId: null,
    imageUrl: null,
    sight: { enabled: true, rangeCells: null, type: "normal" },
  };
}

/** Saisie numérique entière bornée ; null si vide ou non numérique. */
export function clampInt(raw: string, min: number, max: number): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** PV : 0 ≤ hp ≤ hpMax (jeton sans max : plafond de repli). */
export function clampHp(raw: string, hpMax: number | null): number | null {
  return clampInt(raw, 0, hpMax ?? 9999);
}

/** Édition d'un jeton : MJ, ou le propriétaire pour ses propres PV. */
export function canEditToken(
  token: { ownerId: string | null },
  isGM: boolean,
  userId: string,
): boolean {
  return isGM || (token.ownerId !== null && token.ownerId === userId);
}

/**
 * URL de carte distante : uniquement http(s) absolu, null sinon.
 * Les blob: ne passent pas ici — ils viennent de l'upload (fallback local).
 */
export function resolveMapUrl(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
