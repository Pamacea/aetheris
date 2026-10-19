import type { Container, Graphics, Sprite } from "pixi.js";
import { cssColor } from "./helpers";
import {
  DEFAULT_CELLS,
  GRID_COLOR,
  type GridSettings,
  type VttPoint,
  type WallLine,
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
      color: cssColor("--aetheris-border", GRID_COLOR),
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
      color: cssColor("--aetheris-border", GRID_COLOR),
      alpha: 0.6,
    });
  }
}

export function redrawWalls(wallGfx: Graphics, wallStates: WallLine[]) {
  wallGfx.clear();
  for (const line of wallStates) {
    if (line.length < 2) continue;
    wallGfx.poly(line.flatMap((p) => [p.x, p.y])).stroke({ width: 3, color: 0xe7dcc6, alpha: 0.9 });
    for (const p of line) wallGfx.circle(p.x, p.y, 4).fill(0xc03a1b);
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
