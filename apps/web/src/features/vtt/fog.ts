import { area } from "./draw";
import type { TokenState, VttSceneCtx, WallLine } from "./types";

/** Segments dérivés des murs (chaque arête d'une polyigne), type inclus. */
export type WallSeg = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  type: WallLine["type"];
};

/** Ouverture du cône de vision (90°). */
export const CONE_RADIANS = Math.PI / 2;

export function wallSegs(wallStates: WallLine[]): WallSeg[] {
  const segs: WallSeg[] = [];
  for (const wall of wallStates) {
    const type = wall.type ?? "wall";
    for (let i = 1; i < wall.points.length; i++) {
      segs.push({
        ax: wall.points[i - 1].x,
        ay: wall.points[i - 1].y,
        bx: wall.points[i].x,
        by: wall.points[i].y,
        type,
      });
    }
  }
  return segs;
}

/** Écart angulaire normalisé dans ]-π, π]. */
function angleDiff(a: number, center: number): number {
  let d = (a - center) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Une fenêtre bloque le déplacement mais pas la ligne de vue. */
function visionSegs(segs: WallSeg[]): WallSeg[] {
  return segs.filter((s) => s.type !== "window");
}

/** Distance du point d'origine au premier segment coupant le rayon. */
export function rayHit(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  segs: WallSeg[],
  maxT: number,
): number {
  let best = maxT;
  for (const s of segs) {
    const sx = s.bx - s.ax;
    const sy = s.by - s.ay;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-9) continue;
    const px = s.ax - ox;
    const py = s.ay - oy;
    const t = (px * sy - py * sx) / denom;
    const u = (px * dy - py * dx) / denom;
    if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

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

/**
 * Un jeton est vu si un jeton du joueur (lui-même compris) le couvre : portée
 * de SA vision, cône éventuel, ligne de vue non coupée (`window` n'occulte pas).
 * `viewers` = jetons possédés par le joueur qui regarde, jamais ceux du MJ.
 */
export function isTokenVisible(
  target: TokenState,
  viewers: TokenState[],
  segs: WallSeg[],
  cellSize: number,
  defaultCells: number,
): boolean {
  const sightSegs = visionSegs(segs);
  for (const viewer of viewers) {
    if (viewer.id === target.id) return true;
    if (!viewer.sight?.enabled) continue;
    const cells = viewer.sight.rangeCells ?? defaultCells;
    const range = Math.max(32, cells * cellSize);
    const dx = target.x - viewer.x;
    const dy = target.y - viewer.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    if (
      viewer.sight.type === "cone" &&
      Math.abs(angleDiff(Math.atan2(dy, dx), (viewer.rot * Math.PI) / 180)) > CONE_RADIANS / 2
    ) {
      continue;
    }
    if (dist > 1e-6) {
      const hit = rayHit(viewer.x, viewer.y, dx / dist, dy / dist, sightSegs, dist);
      if (hit < dist - 1e-6) continue;
    }
    return true;
  }
  return false;
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
