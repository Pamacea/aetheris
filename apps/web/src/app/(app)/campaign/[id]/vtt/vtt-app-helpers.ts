import { Text } from "pixi.js";
import { resolveColor } from "@/lib/pixi-theme";
import { TOKEN_COLORS, type GridSettings, type TokenState, type VttPoint } from "./vtt-app-types";

/**
 * Titre de note borné à `maxLines` lignes (avec …) : Pixi wrap mais ne tronque
 * pas. Mesure réelle via un Text jeton — les tokens-notes sont rares.
 */
export function noteTitle(text: string, fontSize: number, width: number, maxLines: number): string {
  const lineH = fontSize * 1.25;
  const probe = new Text({
    text,
    style: {
      fontFamily: "Cinzel, serif",
      fontSize,
      lineHeight: lineH,
      wordWrap: true,
      wordWrapWidth: width,
      breakWords: true,
    },
  });
  let out = text.trim();
  if (probe.height > lineH * maxLines) {
    const words = out.split(/\s+/);
    while (words.length > 1) {
      words.pop();
      out = `${words.join(" ")}…`;
      probe.text = out;
      if (probe.height <= lineH * maxLines) break;
    }
  }
  probe.destroy({ style: true, texture: true, textureSource: true });
  return out;
}

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
  noteId?: string,
): TokenState {
  const base = g.type !== "none" ? g.size : 64;
  const t: TokenState = {
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
  if (noteId) t.noteId = noteId;
  return t;
}
