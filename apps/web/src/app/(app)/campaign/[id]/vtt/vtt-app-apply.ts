import type { Container } from "pixi.js";
import { scheduleFog } from "./vtt-app-fog";
import { buildToken } from "./vtt-app-token";
import type { TokenState, VttBridge, VttSceneCtx } from "./vtt-app-types";

/** Token sous le point monde (hit circulaire, du dernier au premier). */
export function hitTokenAt(tokenStates: TokenState[], wx: number, wy: number): TokenState | null {
  for (let i = tokenStates.length - 1; i >= 0; i--) {
    const t = tokenStates[i];
    // Rayon généreux : couvre l'écart max du snap (demi-diagonale de
    // la cellule ≈ 0,71·cellule, le token fait 0,9·cellule) et la
    // demi-diagonale du parchemin (≈ 0,64·taille).
    // shortcut: hit circulaire sur le rectangle des notes, les coins du
    // parchemin hors rayon ne répondent pas, passer à un vrai AABB quand
    // un clic dans un coin de note devra être fiable.
    if (Math.hypot(wx - t.x, wy - t.y) <= t.size * 0.9) return t;
  }
  return null;
}

/** Reconstruit tous les conteneurs tokens (ajout / PV / nom / sélection). */
function rebuildTokens(ctx: VttSceneCtx) {
  for (const child of [...ctx.tokensLayer.children]) child.destroy({ children: true });
  for (const t of ctx.tokenStates) ctx.tokensLayer.addChild(buildToken(t, ctx.selectedToken));
  scheduleFog(ctx);
}

/**
 * Applique une liste côté Pixi. Si seuls x/y/rot changent (drag distant
 * reçu par WS, fin de drag local), déplace les conteneurs existants :
 * reconstruire ~N Text pour un déplacement est le poste de coût dominant.
 * Toute autre différence (ajout, PV, nom…) → reconstruction complète.
 */
export function applyTokens(ctx: VttSceneCtx, list: TokenState[], sel: string | null) {
  const sameShape =
    sel === ctx.selectedToken &&
    list.length === ctx.tokenStates.length &&
    list.every((t, i) => {
      const o = ctx.tokenStates[i];
      return (
        t.id === o.id &&
        t.name === o.name &&
        t.color === o.color &&
        t.size === o.size &&
        t.hp === o.hp &&
        t.hpMax === o.hpMax &&
        t.noteId === o.noteId
      );
    });
  if (sameShape) {
    let moved = false;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const o = ctx.tokenStates[i];
      if (t.x === o.x && t.y === o.y && t.rot === o.rot) continue;
      const child = ctx.tokensLayer.children[i] as Container | undefined;
      if (!child) continue;
      child.position.set(t.x, t.y);
      const body = child.children[0];
      if (body) body.rotation = (t.rot * Math.PI) / 180;
      if (t.x !== o.x || t.y !== o.y) moved = true;
    }
    ctx.tokenStates = list;
    if (moved) scheduleFog(ctx);
    return;
  }
  ctx.tokenStates = list;
  ctx.selectedToken = sel;
  rebuildTokens(ctx);
}

/** Applique immédiatement côté Pixi puis remonte l'état React (garde anti-double). */
export function commitTokens(
  ctx: VttSceneCtx,
  bridge: VttBridge,
  list: TokenState[],
  sel: string | null,
) {
  applyTokens(ctx, list, sel);
  bridge.setTokens(list);
  bridge.setSelectedId(sel);
}
