import { describe, expect, it, vi } from "vitest";
import { rayHit, visionPoly, wallSegs } from "./vtt-app-fog";

// Tracé Pixi (grid/tokens) hors sujet ici : la géométrie du brouillard est pure.
vi.mock("./vtt-app-draw", () => ({ area: () => ({ w: 0, h: 0 }) }));

describe("wallSegs", () => {
  it("une polyigne à N points donne N-1 segments", () => {
    const segs = wallSegs([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    ]);
    expect(segs).toEqual([
      { ax: 0, ay: 0, bx: 10, by: 0 },
      { ax: 10, ay: 0, bx: 10, by: 10 },
    ]);
  });

  it("polyigne d'un seul point : aucun segment", () => {
    expect(wallSegs([[{ x: 5, y: 5 }]])).toEqual([]);
    expect(wallSegs([])).toEqual([]);
  });

  it("cumule les segments de plusieurs traits", () => {
    const segs = wallSegs([
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ],
    ]);
    expect(segs).toHaveLength(3);
  });
});

describe("rayHit", () => {
  const murVertical = [{ ax: 10, ay: 0, bx: 10, by: 10 }];

  it("distance jusqu'au premier mur traversé", () => {
    expect(rayHit(0, 0, 1, 0, murVertical, 100)).toBe(10);
  });

  it("rayon sans intersection : borné à maxT", () => {
    expect(rayHit(0, 0, -1, 0, murVertical, 100)).toBe(100); // s'éloigne
    expect(rayHit(0, 0, 0, 1, murVertical, 100)).toBe(100); // parallèle
  });

  it("intersection hors du segment (u hors [0,1]) : ignorée", () => {
    // Mur au-dessus du rayon horizontal : la droite coupe, le segment non.
    const murHaut = [{ ax: 10, ay: 5, bx: 10, by: 10 }];
    expect(rayHit(0, 0, 1, 0, murHaut, 100)).toBe(100);
  });

  it("mur situé derrière l'origine du rayon (t < 0) : ignoré", () => {
    expect(rayHit(20, 0, 1, 0, murVertical, 100)).toBe(100);
  });

  it("plusieurs murs : garde le plus proche", () => {
    const segs = [
      { ax: 30, ay: -10, bx: 30, by: 10 },
      { ax: 10, ay: -10, bx: 10, by: 10 },
    ];
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
    const murs = [{ ax: 10, ay: 0, bx: 10, by: 100 }];
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
    const murs = [{ ax: 40, ay: 20, bx: 60, by: 80 }];
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
});
