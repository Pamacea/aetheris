import { describe, expect, it } from "vitest";
import {
  clampZoom,
  curveControl,
  curveMidpoint,
  graphToScreen,
  hasLinkBetween,
  initialPositions,
  screenToGraph,
  VIEW_H,
  VIEW_W,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAround,
} from "./layout";

const nodes = [
  { id: "a", type: "personnage" },
  { id: "b", type: "personnage" },
  { id: "c", type: "lieu" },
  { id: "d", type: "faction" },
];

describe("initialPositions", () => {
  it("donne une position à chaque nœud", () => {
    const pos = initialPositions(nodes);
    for (const n of nodes) expect(pos[n.id]).toBeDefined();
    expect(Object.keys(pos)).toHaveLength(nodes.length);
  });

  it("est déterministe", () => {
    expect(initialPositions(nodes)).toEqual(initialPositions(nodes));
  });

  it("ne superpose jamais deux nœuds", () => {
    const pos = initialPositions(nodes);
    const seen = new Set(Object.values(pos).map((p) => `${p.x},${p.y}`));
    expect(seen.size).toBe(nodes.length);
  });

  it("reste dans le cadre", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `n${i}`,
      type: `t${i % 5}`,
    }));
    for (const p of Object.values(initialPositions(many, VIEW_W, VIEW_H))) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(VIEW_W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(VIEW_H);
    }
  });
});

describe("hasLinkBetween", () => {
  it("détecte un lien dans les deux sens", () => {
    const links = [{ fromEntityId: "a", toEntityId: "b" }];
    expect(hasLinkBetween(links, "a", "b")).toBe(true);
    expect(hasLinkBetween(links, "b", "a")).toBe(true);
    expect(hasLinkBetween(links, "a", "c")).toBe(false);
    expect(hasLinkBetween([], "a", "b")).toBe(false);
  });
});

describe("clampZoom", () => {
  it(" borne le zoom entre ZOOM_MIN et ZOOM_MAX", () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(clampZoom(2.7))).toBe(2.7);
  });
});

describe("curveControl", () => {
  it("se décale perpendiculairement au milieu du segment", () => {
    const a = { x: 10, y: 20 };
    const b = { x: 130, y: 90 };
    const c = curveControl(a, b, 40);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    // perpendiculaire : produit scalaire décalage · direction = 0
    expect((c.x - mx) * (b.x - a.x) + (c.y - my) * (b.y - a.y)).toBeCloseTo(0);
    expect(Math.hypot(c.x - mx, c.y - my)).toBeCloseTo(40);
  });

  it("reste au milieu horizontal pour un segment horizontal", () => {
    const c = curveControl({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(c.x).toBeCloseTo(50);
    expect(c.y).toBeCloseTo(40);
  });

  it("boucle vers le haut sur un lien sans longueur", () => {
    expect(curveControl({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: -35 });
  });
});

describe("curveMidpoint", () => {
  it("donne le point de la courbe quadratique à t=0.5", () => {
    const mid = curveMidpoint({ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 0 });
    expect(mid).toEqual({ x: 25, y: 50 });
  });

  it("vaut le milieu quand le contrôle est aligné", () => {
    expect(curveMidpoint({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 })).toEqual({
      x: 5,
      y: 0,
    });
  });
});

describe("zoom / pan", () => {
  it("graphToScreen et screenToGraph sont inverses", () => {
    const pan = { x: 30, y: -12 };
    const zoom = 2;
    const g = { x: 120, y: 45 };
    const s = graphToScreen(g, pan, zoom);
    expect(s).toEqual({ x: 270, y: 78 });
    const back = screenToGraph(s, pan, zoom);
    expect(back.x).toBeCloseTo(g.x);
    expect(back.y).toBeCloseTo(g.y);
  });

  it("zoomAround garde fixe le point sous le curseur", () => {
    const pan = { x: 40, y: 25 };
    const zoom = 1.5;
    const anchor = { x: 600, y: 300 }; // point écran (viewBox)
    const graphPt = screenToGraph(anchor, pan, zoom);
    const newPan = zoomAround(anchor, pan, zoom, 2.4);
    const after = screenToGraph(anchor, newPan, 2.4);
    expect(after.x).toBeCloseTo(graphPt.x);
    expect(after.y).toBeCloseTo(graphPt.y);
  });

  it("avec un pan nul, zoomer ne bouge pas l'origine", () => {
    expect(zoomAround({ x: 0, y: 0 }, { x: 0, y: 0 }, 1, 2)).toEqual({ x: 0, y: 0 });
  });
});
