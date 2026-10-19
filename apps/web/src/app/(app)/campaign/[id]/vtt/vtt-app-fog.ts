import { area } from "./vtt-app-draw";
import type { VttSceneCtx, WallLine } from "./vtt-app-types";

/** Segments dérivés des murs (chaque arête d'une polyigne). */
type WallSeg = { ax: number; ay: number; bx: number; by: number };

export function wallSegs(wallStates: WallLine[]): WallSeg[] {
  const segs: WallSeg[] = [];
  for (const line of wallStates) {
    for (let i = 1; i < line.length; i++) {
      segs.push({
        ax: line[i - 1].x,
        ay: line[i - 1].y,
        bx: line[i].x,
        by: line[i].y,
      });
    }
  }
  return segs;
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
  segs: WallSeg[],
  range: number,
  w: number,
  h: number,
): number[] {
  const angles: number[] = [];
  const N = 120;
  for (let i = 0; i < N; i++) angles.push((i / N) * Math.PI * 2);
  const EPS = 0.0001;
  for (const s of segs) {
    for (const ex of [s.ax, s.bx]) {
      for (const ey of [s.ay, s.by]) {
        const a = Math.atan2(ey - oy, ex - ox);
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
  if (!ctx.fogEnabled) return;
  const { w, h } = area(ctx.mapSprite, ctx.gridSettings);
  if (w <= 0 || h <= 0) return;
  // Marge : les trous (bornés par la zone) restent strictement dedans.
  const PAD = 400;
  gfx.rect(-PAD, -PAD, w + PAD * 2, h + PAD * 2).fill({ color: 0x0b0907, alpha: 0.96 });
  const segs = wallSegs(ctx.wallStates);
  const range = Math.max(32, ctx.sightCells * ctx.gridSettings.size);
  for (const t of ctx.tokenStates) {
    if (t.x < 0 || t.y < 0 || t.x > w || t.y > h) continue;
    const poly = visionPoly(t.x, t.y, segs, range, w, h);
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
