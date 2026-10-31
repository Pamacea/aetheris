import type { SceneState, SceneToken, Wall } from "./schemas/ws.js";

/**
 * Géométrie de vision + filtrage d'état partagés web ↔ serveur.
 * Pur (aucune dépendance navigateur/Pixi) : le gateway filtre les mêmes
 * jetons que ceux que le client joueur rend visibles.
 */

/** Segments dérivés des murs (chaque arête d'une polyigne), type inclus. */
export type WallSeg = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  type: Wall["type"];
};

/** Ouverture du cône de vision (90°). */
export const CONE_RADIANS = Math.PI / 2;

export function wallSegs(wallStates: Wall[]): WallSeg[] {
  const segs: WallSeg[] = [];
  for (const wall of wallStates) {
    const type = wall.type ?? "wall";
    for (let i = 1; i < wall.points.length; i++) {
      const a = wall.points[i - 1];
      const b = wall.points[i];
      if (!a || !b) continue;
      segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, type });
    }
  }
  return segs;
}

/** Écart angulaire normalisé dans ]-π, π]. */
export function angleDiff(a: number, center: number): number {
  let d = (a - center) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Une fenêtre bloque le déplacement mais pas la ligne de vue. */
export function visionSegs(segs: WallSeg[]): WallSeg[] {
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
 * Un jeton est vu si un jeton du joueur (lui-même compris) le couvre : portée
 * de SA vision, cône éventuel, ligne de vue non coupée (`window` n'occulte pas).
 * `viewers` = jetons possédés par le joueur qui regarde, jamais ceux du MJ.
 */
export function isTokenVisible(
  target: SceneToken,
  viewers: SceneToken[],
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

export interface SceneViewer {
  isGM: boolean;
  userId: string;
  /** Propriétaire de chaque jeton (id → userId, null = MJ seul). */
  tokenOwners: ReadonlyMap<string, string | null>;
}

/**
 * État de scène sûr pour un spectateur : le MJ reçoit tout ; un joueur ne voit
 * ni les murs `secret` (retirés, pas convertis : leur géométrie ne doit pas
 * fuiter), ni les notes de théâtre, ni les jetons hors de la vision de ses
 * jetons. L'occlusion utilise tous les murs, secrets compris.
 */
export function sceneStateForViewer(state: SceneState, viewer: SceneViewer): SceneState {
  if (viewer.isGM) return state;
  const segs = wallSegs(state.walls);
  const viewers = state.tokens.filter((t) => viewer.tokenOwners.get(t.id) === viewer.userId);
  return {
    ...state,
    walls: state.walls.filter((w) => w.type !== "secret"),
    theatreNotes: [],
    // Brouillard coupé : la table est entièrement visible (même règle client).
    tokens: state.fog.on
      ? state.tokens.filter((t) =>
          isTokenVisible(t, viewers, segs, state.grid.size, state.fog.sightCells),
        )
      : state.tokens,
  };
}
