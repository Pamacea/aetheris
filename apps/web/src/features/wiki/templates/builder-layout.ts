import {
  cellsFree,
  GRID_COLS,
  GRID_GAP_PX,
  GRID_ROW_PX,
  type TemplateField,
} from "@aetheris/shared";

export const ROW_STRIDE = GRID_ROW_PX + GRID_GAP_PX;
export const MIN_W = 1;
export const MIN_H = 2;
export const MAX_W = GRID_COLS;
export const MAX_H = 199;
export const MAX_Y = 199;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function xFromDrag(startX: number, dx: number, colStride: number, w: number): number {
  if (colStride <= 0) return startX;
  return clamp(Math.round(startX + dx / colStride), 0, MAX_W - w);
}

export function yFromDrag(startY: number, dy: number, rowStride: number, h: number): number {
  if (rowStride <= 0) return startY;
  return clamp(Math.round(startY + dy / rowStride), 0, MAX_Y - h);
}

export function wFromDrag(startW: number, dx: number, colStride: number, x: number): number {
  if (colStride <= 0) return startW;
  return clamp(Math.round(startW + dx / colStride), MIN_W, MAX_W - x);
}

export function hFromDrag(startH: number, dy: number, rowStride: number): number {
  if (rowStride <= 0) return startH;
  return clamp(Math.round(startH + dy / rowStride), MIN_H, MAX_H);
}

export type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type Box = { x: number; y: number; w: number; h: number };

/** Candidat retenu seulement s'il ne chevauche aucun autre champ. */
export function keepIfFree(
  fields: TemplateField[],
  current: Box,
  candidate: Box,
  ignoreIndex: number,
): Box {
  return cellsFree(fields, candidate.x, candidate.y, candidate.w, candidate.h, ignoreIndex)
    ? candidate
    : current;
}

/** Applique un redimensionnement directionnel (bords et coins). */
export function applyResize(
  dir: ResizeDir,
  start: Box,
  dx: number,
  dy: number,
  colStride: number,
  rowStride: number,
): Box {
  let { x, y, w, h } = start;
  if (colStride > 0 && dir.includes("w")) {
    x = clamp(Math.round(start.x + dx / colStride), 0, start.x + start.w - MIN_W);
    w = clamp(start.w + (start.x - x), MIN_W, MAX_W);
    // Bord droit fixe même si la largeur a été clampée.
    x = start.x + start.w - w;
  } else if (colStride > 0 && dir.includes("e")) {
    w = wFromDrag(start.w, dx, colStride, start.x);
  }
  if (rowStride > 0 && dir.includes("n")) {
    y = clamp(Math.round(start.y + dy / rowStride), 0, start.y + start.h - MIN_H);
    h = clamp(start.h + (start.y - y), MIN_H, MAX_H);
    // Bord bas fixe même si la hauteur a été clampée.
    y = start.y + start.h - h;
  } else if (rowStride > 0 && dir.includes("s")) {
    h = Math.min(hFromDrag(start.h, dy, rowStride), MAX_Y - start.y);
  }
  return { x, y, w, h };
}

/** Premier emplacement libre proche de (x, y), en descendant ligne par ligne. */
export function findFreeSpot(
  fields: TemplateField[],
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const maxX = Math.max(0, GRID_COLS - w);
  const startX = Math.min(maxX, Math.max(0, x));
  const startY = clamp(y, 0, MAX_Y - h);
  for (let yy = startY; yy <= MAX_Y - h; yy++) {
    for (let xx = startX; xx <= maxX; xx++) {
      if (cellsFree(fields, xx, yy, w, h, -1)) return { x: xx, y: yy };
    }
    for (let xx = 0; xx < startX; xx++) {
      if (cellsFree(fields, xx, yy, w, h, -1)) return { x: xx, y: yy };
    }
  }
  return { x: startX, y: startY };
}
