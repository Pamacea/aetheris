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
