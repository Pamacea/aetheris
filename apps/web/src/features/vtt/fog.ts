import {
  angleDiff,
  CONE_RADIANS,
  isTokenVisible,
  rayHit,
  visionSegs,
  wallSegs,
  type WallSeg,
} from "@aetheris/shared";
import { area } from "./draw";
import type { VttSceneCtx } from "./types";

/** Géométrie pure partagée avec le serveur (filtrage des jetons côté WS). */
export type { WallSeg } from "@aetheris/shared";
export { CONE_RADIANS, isTokenVisible, rayHit, wallSegs } from "@aetheris/shared";

/**
 * Polygone de vision : rayons réguliers + angles vers les extrémités des
 * murs (±ε), tronqués au premier mur, au bord de la zone et à la portée.
 */
export function visionPoly(
  ox: number,
  oy: number,
  allSegs: WallSeg[],
  range: number,
  w: number,
  h: number,
  cone?: { center: number; width: number },
): number[] {
  const segs = visionSegs(allSegs);
  const angles: number[] = [];
  const N = cone ? 90 : 120;
  for (let i = 0; i < N; i++) {
    angles.push(cone ? cone.center - cone.width / 2 + (i / N) * cone.width : (i / N) * Math.PI * 2);
  }
  const EPS = 0.0001;
  for (const s of segs) {
    for (const ex of [s.ax, s.bx]) {
      for (const ey of [s.ay, s.by]) {
        const a = Math.atan2(ey - oy, ex - ox);
        if (cone && Math.abs(angleDiff(a, cone.center)) > cone.width / 2 + EPS) continue;
        angles.push(a - EPS, a, a + EPS);
      }
    }
  }
  angles.sort((a, b) => a - b);
  const pts: number[] = [];
  for (const a of angles) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    // Sortie de la zone (rect 0,0 → w,h) : le trou reste dans le brouillard.
    let tBox = Infinity;
    if (dx > 1e-9) tBox = Math.min(tBox, (w - ox) / dx);
    else if (dx < -1e-9) tBox = Math.min(tBox, -ox / dx);
    if (dy > 1e-9) tBox = Math.min(tBox, (h - oy) / dy);
    else if (dy < -1e-9) tBox = Math.min(tBox, -oy / dy);
    if (!Number.isFinite(tBox) || tBox < 0) tBox = 0;
    let t = Math.min(range, tBox);
    t = rayHit(ox, oy, dx, dy, segs, t);
    pts.push(ox + dx * t, oy + dy * t);
  }
  return pts;
}

/** Redessine le voile + les trous de vision (un par token dans la zone). */
function redrawFog(ctx: VttSceneCtx) {
  const gfx = ctx.fogGfx;
  gfx.clear();
  // Mode MJ : pas de voile, le MJ voit toute la table (et tous les jetons).
  if (!ctx.fogEnabled || ctx.isGM) {
    if (!ctx.isGM) for (const child of ctx.tokensLayer.children) child.visible = true;
    return;
  }
  const { w, h } = area(ctx.mapSprite, ctx.gridSettings);
  if (w <= 0 || h <= 0) return;
  // Marge : les trous (bornés par la zone) restent strictement dedans.
  const PAD = 400;
  gfx.rect(-PAD, -PAD, w + PAD * 2, h + PAD * 2).fill({ color: 0x0b0907, alpha: 0.96 });
  const segs = wallSegs(ctx.wallStates);

  // Seuls les jetons DU JOUEUR éclairent et révèlent (ceux du MJ non).
  const viewers = ctx.tokenStates.filter((t) => t.ownerId !== null && t.ownerId === ctx.viewerId);

  // Joueurs : seuls les jetons dans un champ de vision sont rendus.
  for (let i = 0; i < ctx.tokenStates.length; i++) {
    const child = ctx.tokensLayer.children[i];
    if (!child) continue;
    child.visible = isTokenVisible(
      ctx.tokenStates[i],
      viewers,
      segs,
      ctx.gridSettings.size,
      ctx.sightCells,
    );
  }

  for (const t of viewers) {
    if (!t.sight.enabled) continue;
    if (t.x < 0 || t.y < 0 || t.x > w || t.y > h) continue;
    // Vision par jeton ; `sightCells` reste la portée par défaut.
    const cells = t.sight.rangeCells ?? ctx.sightCells;
    const range = Math.max(32, cells * ctx.gridSettings.size);
    const cone =
      t.sight.type === "cone"
        ? { center: (t.rot * Math.PI) / 180, width: CONE_RADIANS }
        : undefined;
    const poly = visionPoly(t.x, t.y, segs, range, w, h, cone);
    if (poly.length < 6) continue;
    gfx.beginPath();
    gfx.poly(poly);
    gfx.cut();
  }
}

/**
 * Brouillard coalescé : les effets React enchaînent grille/tokens/murs
 * et déclencheraient N raycast identiques dans la même frame — un seul
 * recalcul par frame, sur l'état le plus récent.
 */
export function scheduleFog(ctx: VttSceneCtx) {
  if (ctx.fogPending) return;
  ctx.fogPending = true;
  requestAnimationFrame(() => {
    ctx.fogPending = false;
    if (ctx.disposed) return;
    redrawFog(ctx);
  });
}
