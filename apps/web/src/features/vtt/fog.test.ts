import { describe, expect, it, vi } from "vitest";
import { isTokenVisible, lightSources, rayHit, visionPoly, wallSegs, type WallSeg } from "./fog";
import type { TokenState } from "./types";

// Tracé Pixi (grid/tokens) hors sujet ici : la géométrie du brouillard est pure.
vi.mock("./draw", () => ({ area: () => ({ w: 0, h: 0 }) }));

const mur = (ax: number, ay: number, bx: number, by: number, type: WallSeg["type"] = "wall") => ({
  ax,
  ay,
  bx,
  by,
  type,
});

const jeton = (over: Partial<TokenState> = {}): TokenState => ({
  id: "t1",
  x: 0,
  y: 0,
  size: 32,
  rot: 0,
  name: "A",
  color: "#c03a1b",
  hp: null,
  hpMax: null,
  ac: null,
  ownerId: null,
  noteId: null,
  imageUrl: null,
  sight: { enabled: true, rangeCells: null, type: "normal" },
  light: { enabled: false, radiusCells: null },
  ...over,
});

describe("wallSegs", () => {
  it("une polyigne à N points donne N-1 segments typés", () => {
    const segs = wallSegs([
      {
        id: "w1",
        type: "wall",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
      },
    ]);
    expect(segs).toEqual([mur(0, 0, 10, 0), mur(10, 0, 10, 10)]);
  });

  it("expose le type de chaque mur (fenêtre, secret)", () => {
    const segs = wallSegs([
      {
        id: "w1",
        type: "window",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
      {
        id: "w2",
        type: "secret",
        points: [
          { x: 5, y: 5 },
          { x: 6, y: 5 },
        ],
      },
    ]);
    expect(segs.map((s) => s.type)).toEqual(["window", "secret"]);
  });

  it("polyigne d'un seul point : aucun segment", () => {
    expect(wallSegs([{ id: "w1", type: "wall", points: [{ x: 5, y: 5 }] }])).toEqual([]);
    expect(wallSegs([])).toEqual([]);
  });

  it("cumule les segments de plusieurs traits", () => {
    const segs = wallSegs([
      {
        id: "w1",
        type: "wall",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
      {
        id: "w2",
        type: "wall",
        points: [
          { x: 5, y: 5 },
          { x: 6, y: 5 },
          { x: 7, y: 5 },
        ],
      },
    ]);
    expect(segs).toHaveLength(3);
  });
});

describe("rayHit", () => {
  const murVertical = [mur(10, 0, 10, 10)];

  it("distance jusqu'au premier mur traversé", () => {
    expect(rayHit(0, 0, 1, 0, murVertical, 100)).toBe(10);
  });

  it("rayon sans intersection : borné à maxT", () => {
    expect(rayHit(0, 0, -1, 0, murVertical, 100)).toBe(100); // s'éloigne
    expect(rayHit(0, 0, 0, 1, murVertical, 100)).toBe(100); // parallèle
  });

  it("intersection hors du segment (u hors [0,1]) : ignorée", () => {
    // Mur au-dessus du rayon horizontal : la droite coupe, le segment non.
    const murHaut = [mur(10, 5, 10, 10)];
    expect(rayHit(0, 0, 1, 0, murHaut, 100)).toBe(100);
  });

  it("mur situé derrière l'origine du rayon (t < 0) : ignoré", () => {
    expect(rayHit(20, 0, 1, 0, murVertical, 100)).toBe(100);
  });

  it("plusieurs murs : garde le plus proche", () => {
    const segs = [mur(30, -10, 30, 10), mur(10, -10, 10, 10)];
    expect(rayHit(0, 0, 1, 0, segs, 100)).toBe(10);
  });
});

describe("visionPoly", () => {
  it("sans mur : 120 rayons réguliers bornés à la portée", () => {
    const poly = visionPoly(50, 50, [], 30, 200, 200);
    expect(poly).toHaveLength(240); // 120 angles × (x, y)
    expect(poly[0]).toBeCloseTo(80, 6);
    expect(poly[1]).toBeCloseTo(50, 6);
    for (let i = 0; i < poly.length; i += 2) {
      const d = Math.hypot(poly[i] - 50, poly[i + 1] - 50);
      expect(d).toBeCloseTo(30, 4);
    }
  });

  it("un mur tronque les rayons derrière lui", () => {
    const murs = [mur(10, 0, 10, 100)];
    const poly = visionPoly(0, 50, murs, 100, 200, 200);
    // Angle 0 (direction +x) : coupé au mur, donc (10, 50) et non x = 100.
    let coupeAuMur = false;
    for (let i = 0; i < poly.length; i += 2) {
      if (Math.abs(poly[i] - 10) < 1e-6 && Math.abs(poly[i + 1] - 50) < 1e-6) coupeAuMur = true;
    }
    expect(coupeAuMur).toBe(true);
    expect(poly.length % 2).toBe(0);
    expect(poly.length).toBeGreaterThan(240); // angles bonus vers les extrémités
  });

  it("tous les points restent dans la zone de jeu", () => {
    const murs = [mur(40, 20, 60, 80)];
    const poly = visionPoly(45, 45, murs, 500, 120, 90);
    for (let i = 0; i < poly.length; i += 2) {
      const eps = 1e-6; // arrondi flottant sur le bord de la zone
      expect(poly[i]).toBeGreaterThanOrEqual(-eps);
      expect(poly[i]).toBeLessThanOrEqual(120 + eps);
      expect(poly[i + 1]).toBeGreaterThanOrEqual(-eps);
      expect(poly[i + 1]).toBeLessThanOrEqual(90 + eps);
    }
  });

  it("près du bord, le rayon s'arrête à la zone avant la portée", () => {
    const poly = visionPoly(195, 50, [], 100, 200, 200);
    expect(poly[0]).toBeCloseTo(200, 6);
    expect(poly[1]).toBeCloseTo(50, 6);
  });

  it("une fenêtre ne coupe pas la vision (contrairement à un mur plein)", () => {
    const fenetre = [mur(10, 0, 10, 100, "window")];
    const poly = visionPoly(0, 50, fenetre, 100, 200, 200);
    // Angle 0 : traverse la fenêtre et va jusqu'à la zone (x=100+).
    expect(poly[0]).toBeCloseTo(Math.min(100, 200), 6);
    expect(poly[1]).toBeCloseTo(50, 6);
    // rayHit, lui, la voit : elle bloque le déplacement.
    expect(rayHit(0, 50, 1, 0, fenetre, 100)).toBe(10);
  });

  it("pierre, caverne et bois bloquent aussi la vision", () => {
    for (const type of ["stone", "cave", "wood"] as const) {
      const poly = visionPoly(0, 50, [mur(10, -10_000, 10, 10_000, type)], 100, 200, 200);
      for (let i = 0; i < poly.length; i += 2) {
        expect(poly[i]).toBeLessThan(10.1);
      }
    }
  });

  it("un mur secret coupe la vision des joueurs", () => {
    // Mur vertical traversant toute la zone : aucun rayon ne passe à droite.
    const secret = [mur(10, -10_000, 10, 10_000, "secret")];
    const poly = visionPoly(0, 50, secret, 100, 200, 200);
    for (let i = 0; i < poly.length; i += 2) {
      expect(poly[i]).toBeLessThan(10.1);
    }
    expect(Math.max(...poly.filter((_, i) => i % 2 === 0))).toBeGreaterThan(9.5);
  });

  it("cône : tous les points restent dans l'ouverture autour de rot", () => {
    const poly = visionPoly(50, 50, [], 30, 200, 200, { center: 0, width: Math.PI / 2 });
    expect(poly.length).toBeGreaterThan(0);
    for (let i = 0; i < poly.length; i += 2) {
      const angle = Math.atan2(poly[i + 1] - 50, poly[i] - 50);
      expect(Math.abs(angle)).toBeLessThanOrEqual(Math.PI / 2 + 1e-6);
      expect(Math.hypot(poly[i] - 50, poly[i + 1] - 50)).toBeCloseTo(30, 4);
    }
  });
});

describe("lightSources", () => {
  const cell = 32;

  it("ne retient que les jetons éclairés visibles ou possédés", () => {
    const moi = jeton({ id: "moi", ownerId: "u1", light: { enabled: true, radiusCells: null } });
    const vu = jeton({ id: "vu", x: 100, light: { enabled: true, radiusCells: 5 } });
    const loin = jeton({ id: "loin", x: 5000, light: { enabled: true, radiusCells: null } });
    const eteint = jeton({ id: "eteint", x: 10, light: { enabled: false, radiusCells: null } });
    const sources = lightSources([moi, vu, loin, eteint], [moi], [], cell, 10, "u1");
    expect(sources.map((t) => t.id)).toEqual(["moi", "vu"]);
  });

  it("un mur coupe la lumière d'un jeton non possédé", () => {
    const moi = jeton({ id: "moi", ownerId: "u1" });
    const cache = jeton({ id: "cache", x: 100, light: { enabled: true, radiusCells: null } });
    const segs = [mur(50, -50, 50, 50)];
    expect(lightSources([moi, cache], [moi], segs, cell, 10, "u1")).toEqual([]);
  });

  it("un jeton possédé reste une source même derrière un mur", () => {
    const moi = jeton({
      id: "moi",
      x: 100,
      ownerId: "u1",
      light: { enabled: true, radiusCells: null },
    });
    const segs = [mur(50, -50, 50, 50)];
    expect(lightSources([moi], [moi], segs, cell, 10, "u1").map((t) => t.id)).toEqual(["moi"]);
  });
});

describe("isTokenVisible", () => {
  const cell = 32;

  it("le jeton voit le sien, et un jeton à portée est visible", () => {
    const a = jeton({ id: "a", x: 0, y: 0 });
    const b = jeton({ id: "b", x: 100, y: 0 });
    expect(isTokenVisible(a, [a], [], cell, 10)).toBe(true);
    expect(isTokenVisible(b, [a], [], cell, 10)).toBe(true);
  });

  it("hors de portée : invisible", () => {
    const a = jeton({ id: "a", x: 0, y: 0 });
    const b = jeton({ id: "b", x: 1000, y: 0 });
    expect(isTokenVisible(b, [a], [], cell, 10)).toBe(false);
  });

  it("un mur plein coupe la ligne de vue, une fenêtre non", () => {
    const a = jeton({ id: "a", x: 0, y: 0 });
    const b = jeton({ id: "b", x: 100, y: 0 });
    const plein = [mur(50, -50, 50, 50)];
    const fenetre = [mur(50, -50, 50, 50, "window")];
    expect(isTokenVisible(b, [a], plein, cell, 10)).toBe(false);
    expect(isTokenVisible(b, [a], fenetre, cell, 10)).toBe(true);
  });

  it("un observateur sans vision n'éclaire pas les autres", () => {
    const a = jeton({
      id: "a",
      x: 0,
      y: 0,
      sight: { enabled: false, rangeCells: null, type: "normal" },
    });
    const b = jeton({ id: "b", x: 100, y: 0 });
    expect(isTokenVisible(b, [a], [], cell, 10)).toBe(false);
    expect(isTokenVisible(a, [a], [], cell, 10)).toBe(true); // se voit lui-même
  });

  it("cône : une cible derrière l'observateur reste invisible", () => {
    const a = jeton({
      id: "a",
      x: 100,
      y: 0,
      rot: 0, // regarde vers +x
      sight: { enabled: true, rangeCells: null, type: "cone" },
    });
    const devant = jeton({ id: "b", x: 200, y: 0 });
    const derriere = jeton({ id: "c", x: 0, y: 0 });
    expect(isTokenVisible(devant, [a], [], cell, 10)).toBe(true);
    expect(isTokenVisible(derriere, [a], [], cell, 10)).toBe(false);
  });

  it("rangeCells du jeton prime sur la portée globale", () => {
    const b = jeton({ id: "b", x: 100, y: 0 });
    const precis = jeton({
      id: "a",
      x: 0,
      y: 0,
      sight: { enabled: true, rangeCells: 2, type: "normal" },
    });
    const global = jeton({ id: "c", x: 0, y: 0 });
    expect(isTokenVisible(b, [precis], [], cell, 10)).toBe(false); // 2 cellules < 100 px
    expect(isTokenVisible(b, [global], [], cell, 4)).toBe(true); // défaut 4 cellules
  });
});
