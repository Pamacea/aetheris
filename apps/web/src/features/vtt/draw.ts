import type { Container, Graphics, Sprite } from "pixi.js";
import { cssColor } from "./helpers";
import {
  DEFAULT_CELLS,
  GRID_COLOR,
  type GridSettings,
  type VttPoint,
  type WallLine,
  type WallSelection,
  type WallType,
} from "./types";

/** Point monde sous un évènement pointeur (compense le rect du canvas + la caméra). */
export function worldPoint(canvas: HTMLCanvasElement, world: Container, e: PointerEvent): VttPoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - world.x) / world.scale.x,
    y: (e.clientY - rect.top - world.y) / world.scale.y,
  };
}

/** Snap centre de token : centre de cellule (carrée) ou centre du hex le plus proche. */
export function snapPoint(g: GridSettings, x: number, y: number): VttPoint {
  if (g.type === "square") {
    return {
      x: g.offsetX + (Math.floor((x - g.offsetX) / g.size) + 0.5) * g.size,
      y: g.offsetY + (Math.floor((y - g.offsetY) / g.size) + 0.5) * g.size,
    };
  }
  if (g.type === "hex") {
    const hexW = Math.sqrt(3) * g.size;
    const row = Math.round((y - g.offsetY) / (1.5 * g.size));
    const shift = ((row % 2) + 2) % 2 !== 0 ? hexW / 2 : 0;
    const col = Math.round((x - g.offsetX - shift) / hexW);
    return {
      x: g.offsetX + col * hexW + shift,
      y: g.offsetY + row * 1.5 * g.size,
    };
  }
  return { x, y };
}

/** Étendue dessinable : texture de carte ou repli « N cellules » sans carte. */
export function area(mapSprite: Sprite | null, g: GridSettings): { w: number; h: number } {
  return {
    w: mapSprite ? mapSprite.texture.width : g.size * DEFAULT_CELLS + g.offsetX,
    h: mapSprite ? mapSprite.texture.height : g.size * DEFAULT_CELLS + g.offsetY,
  };
}

export function redrawGrid(gfx: Graphics, g: GridSettings, size: { w: number; h: number }) {
  gfx.clear();
  if (g.type === "none" || g.size < 8) return;
  const { w, h } = size;
  const ox = g.offsetX;
  const oy = g.offsetY;
  const s = g.size;
  if (g.type === "square") {
    for (let x = ox; x <= w + 1; x += s) gfx.moveTo(x, 0).lineTo(x, h);
    for (let y = oy; y <= h + 1; y += s) gfx.moveTo(0, y).lineTo(w, y);
    gfx.stroke({
      width: 1,
      // minLum : une bordure de thème sombre disparaît sur le fond #0b0907.
      color: cssColor("--aetheris-border", GRID_COLOR, 0.3),
      alpha: 0.6,
    });
  } else {
    // Hexagones pointe en haut : espacement √3·R en X, 1,5·R en Y.
    const hexW = Math.sqrt(3) * s;
    const rows = Math.ceil(h / (1.5 * s)) + 2;
    const cols = Math.ceil(w / hexW) + 2;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = ox + col * hexW + (row % 2 !== 0 ? hexW / 2 : 0);
        const cy = oy + row * 1.5 * s;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i + 30);
          const vx = cx + s * Math.cos(a);
          const vy = cy + s * Math.sin(a);
          if (i === 0) gfx.moveTo(vx, vy);
          else gfx.lineTo(vx, vy);
        }
        gfx.closePath();
      }
    }
    gfx.stroke({
      width: 1,
      // minLum : une bordure de thème sombre disparaît sur le fond #0b0907.
      color: cssColor("--aetheris-border", GRID_COLOR, 0.3),
      alpha: 0.6,
    });
  }
}

export interface WallVertexHit {
  wallId: string;
  index: number;
  x: number;
  y: number;
}

/** Sommet existant le plus proche (rayon `maxDist`), pour le snap et la sélection. */
export function nearestVertex(
  walls: WallLine[],
  x: number,
  y: number,
  maxDist: number,
): WallVertexHit | null {
  let best: WallVertexHit | null = null;
  let bestDist = maxDist;
  for (const wall of walls) {
    for (let i = 0; i < wall.points.length; i++) {
      const p = wall.points[i];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= bestDist) {
        best = { wallId: wall.id, index: i, x: p.x, y: p.y };
        bestDist = d;
      }
    }
  }
  return best;
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Mur sous le point (distance au segment ≤ maxDist). */
export function hitWallSegment(
  walls: WallLine[],
  x: number,
  y: number,
  maxDist: number,
): { wallId: string; index: number } | null {
  for (const wall of walls) {
    for (let i = 1; i < wall.points.length; i++) {
      const a = wall.points[i - 1];
      const b = wall.points[i];
      if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= maxDist) {
        return { wallId: wall.id, index: i };
      }
    }
  }
  return null;
}

/** Snap du tracé : sommet existant d'abord, sinon grille. */
export function snapWallPoint(g: GridSettings, walls: WallLine[], x: number, y: number): VttPoint {
  const vertex = nearestVertex(walls, x, y, Math.max(8, g.size * 0.35));
  return vertex ? { x: vertex.x, y: vertex.y } : snapPoint(g, x, y);
}

/** Style de trait par type ; `dash` = pointillés, `tick` = traits de bois. */
const WALL_STYLE: Record<
  WallType,
  { color: number; width: number; alpha: number; dash?: number; tick?: number }
> = {
  wall: { color: 0xe7dcc6, width: 3, alpha: 0.9 },
  stone: { color: 0x9aa0a6, width: 4, alpha: 1 },
  cave: { color: 0x7a6b59, width: 3, alpha: 0.9, dash: 9 },
  wood: { color: 0x8b5a2b, width: 3, alpha: 1, tick: 20 },
  secret: { color: 0xd946ef, width: 2, alpha: 0.9, dash: 8 },
  window: { color: 0x67e8f9, width: 2, alpha: 0.55 },
};

/** Pointillés maison (Pixi n'a pas de dash natif) + traits perpendiculaires. */
function strokeStyled(
  gfx: Graphics,
  points: VttPoint[],
  style: (typeof WALL_STYLE)[WallType],
  width: number,
  color: number,
) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const dash = style.dash;
    if (dash) {
      for (let d = 0; d < len; d += dash) {
        const e = Math.min(len, d + dash * 0.6);
        gfx
          .moveTo(a.x + ux * d, a.y + uy * d)
          .lineTo(a.x + ux * e, a.y + uy * e)
          .stroke({ width, color, alpha: style.alpha });
      }
    } else {
      gfx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color, alpha: style.alpha });
    }
    if (style.tick) {
      for (let d = style.tick / 2; d < len; d += style.tick) {
        const cx = a.x + ux * d;
        const cy = a.y + uy * d;
        gfx
          .moveTo(cx - uy * 4, cy + ux * 4)
          .lineTo(cx + uy * 4, cy - ux * 4)
          .stroke({ width: 1, color, alpha: 0.8 });
      }
    }
  }
}

/** Murs typés ; les secrets ne sont dessinés que pour le MJ (vision joueur). */
export function redrawWalls(
  wallGfx: Graphics,
  walls: WallLine[],
  isGM: boolean,
  selection: WallSelection | null = null,
) {
  wallGfx.clear();
  for (const wall of walls) {
    if (wall.points.length < 2) continue;
    if (!isGM && wall.type === "secret") continue;
    const style = WALL_STYLE[wall.type] ?? WALL_STYLE.wall;
    const selected = selection?.wallId === wall.id;
    // Contour sombre sous le trait coloré : lisible aussi sur une carte claire.
    strokeStyled(wallGfx, wall.points, { ...style, alpha: 0.55 }, style.width + 3, 0x0b0907);
    strokeStyled(
      wallGfx,
      wall.points,
      style,
      selected ? style.width + 2 : style.width,
      selected ? 0xe7dcc6 : style.color,
    );
    for (let i = 0; i < wall.points.length; i++) {
      const p = wall.points[i];
      const isSelVertex = selected && selection?.vertex === i;
      wallGfx.circle(p.x, p.y, isSelVertex ? 7 : 4).fill(isSelVertex ? 0xe7dcc6 : 0xc03a1b);
    }
  }
}

export function redrawDraft(draftGfx: Graphics, draft: VttPoint[], draftCursor: VttPoint | null) {
  draftGfx.clear();
  if (draft.length === 0) return;
  draftGfx.moveTo(draft[0].x, draft[0].y);
  for (let i = 1; i < draft.length; i++) {
    draftGfx.lineTo(draft[i].x, draft[i].y);
  }
  if (draftCursor) draftGfx.lineTo(draftCursor.x, draftCursor.y);
  draftGfx.stroke({ width: 3, color: 0xe7dcc6, alpha: 0.95 });
  for (const p of draft) draftGfx.circle(p.x, p.y, 5).fill(0xc03a1b);
}
