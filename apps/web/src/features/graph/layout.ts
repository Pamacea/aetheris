/** Logique pure du graphe (testable sans DOM) : positions initiales + paires. */

export interface Pt {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  title: string;
  type: string;
}

export interface GraphLink {
  id: string;
  label: string | null;
  fromEntityId: string;
  toEntityId: string;
}

export const VIEW_W = 1000;
export const VIEW_H = 640;

/**
 * Positions initiales déterministes : un anneau de types autour du centre,
 * chaque type avec son propre petit cercle. La simulation de forces affine
 * ensuite — ce calcul donne un départ lisible même avant la première frame.
 */
export function initialPositions(
  nodes: ReadonlyArray<{ id: string; type: string }>,
  width: number = VIEW_W,
  height: number = VIEW_H,
): Record<string, Pt> {
  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    const ids = groups.get(node.type);
    if (ids) ids.push(node.id);
    else groups.set(node.type, [node.id]);
  }

  const cx = width / 2;
  const cy = height / 2;
  const ringR = Math.min(cx, cy) * 0.55;
  const types = [...groups.keys()];
  const out: Record<string, Pt> = {};

  types.forEach((type, i) => {
    // Un type seul → en haut ; sinon répartis régulièrement autour du centre.
    const angle = (i / types.length) * Math.PI * 2 - Math.PI / 2;
    const gx = cx + Math.cos(angle) * ringR;
    const gy = cy + Math.sin(angle) * ringR;
    const ids = groups.get(type)!;
    const localR = Math.min(110, 24 + ids.length * 9);
    ids.forEach((id, j) => {
      const a = (j / ids.length) * Math.PI * 2;
      out[id] = { x: gx + Math.cos(a) * localR, y: gy + Math.sin(a) * localR };
    });
  });

  return out;
}

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 3.5;

/** Zoom borné : ni trou de fourmi, ni plongée. */
export function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

/**
 * Point de contrôle d'une courbe quadratique : milieu du segment décalé le
 * long de la perpendiculaire (offset = écart de la courbe hors de la droite).
 */
export function curveControl(a: Pt, b: Pt, offset: number = 40): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { x: mx, y: my - offset }; // lien auto : petite boucle vers le haut
  return { x: mx - (dy / d) * offset, y: my + (dx / d) * offset };
}

/** Point de la courbe quadratique à t=0.5 — où poser le libellé. */
export function curveMidpoint(a: Pt, c: Pt, b: Pt): Pt {
  return { x: (a.x + 2 * c.x + b.x) / 4, y: (a.y + 2 * c.y + b.y) / 4 };
}

/** Coordonnée locale du graphe → coordonnée écran (viewBox), avec pan + zoom. */
export function graphToScreen(p: Pt, pan: Pt, zoom: number): Pt {
  return { x: pan.x + p.x * zoom, y: pan.y + p.y * zoom };
}

/** Inverse de graphToScreen : coordonnée écran (viewBox) → coordonnée locale. */
export function screenToGraph(p: Pt, pan: Pt, zoom: number): Pt {
  return { x: (p.x - pan.x) / zoom, y: (p.y - pan.y) / zoom };
}

/** Pan tel que le point écran p reste fixe lors d'un zoom de zoom → nextZoom. */
export function zoomAround(p: Pt, pan: Pt, zoom: number, nextZoom: number): Pt {
  const k = nextZoom / zoom;
  return { x: p.x - (p.x - pan.x) * k, y: p.y - (p.y - pan.y) * k };
}

/** Existe-t-il déjà un lien (dans un sens ou l'autre) entre deux entités ? */
export function hasLinkBetween(
  links: ReadonlyArray<Pick<GraphLink, "fromEntityId" | "toEntityId">>,
  a: string,
  b: string,
): boolean {
  return links.some(
    (l) =>
      (l.fromEntityId === a && l.toEntityId === b) || (l.fromEntityId === b && l.toEntityId === a),
  );
}
