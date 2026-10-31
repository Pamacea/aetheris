import { describe, expect, it } from "vitest";
import type { TemplateField } from "@aetheris/shared";
import {
  applyResize,
  findFreeSpot,
  hFromDrag,
  keepIfFree,
  wFromDrag,
  xFromDrag,
  yFromDrag,
} from "./builder-layout";

describe("xFromDrag / yFromDrag", () => {
  it("snappe le déplacement à la cellule", () => {
    expect(xFromDrag(2, 60, 30, 3)).toBe(4);
    expect(yFromDrag(1, 48, 24, 4)).toBe(3);
  });

  it("refuse une position hors de la grille", () => {
    expect(xFromDrag(8, 300, 30, 3)).toBe(9);
    expect(xFromDrag(1, -300, 30, 3)).toBe(0);
    expect(yFromDrag(2, 10_000, 24, 4)).toBe(195);
    expect(yFromDrag(1, -300, 24, 4)).toBe(0);
  });

  it("pas de déplacement sans stride", () => {
    expect(xFromDrag(2, 60, 0, 3)).toBe(2);
    expect(yFromDrag(1, 60, 0, 4)).toBe(1);
  });
});

describe("wFromDrag / hFromDrag", () => {
  it("snappe et clampe la taille", () => {
    expect(wFromDrag(2, 30, 30, 0)).toBe(3);
    expect(wFromDrag(8, 300, 30, 0)).toBe(12);
    expect(wFromDrag(1, -300, 30, 0)).toBe(1);
    expect(hFromDrag(6, 24, 24)).toBe(7);
    expect(hFromDrag(6, -300, 24)).toBe(2);
    // Pas de plafond de confort : seule la hauteur du canvas (199 rangées) borne.
    expect(hFromDrag(20, 300, 24)).toBe(33);
    expect(hFromDrag(20, 10_000, 24)).toBe(199);
  });

  it("la largeur ne dépasse pas la grille depuis x", () => {
    expect(wFromDrag(2, 300, 30, 9)).toBe(3);
  });
});

describe("applyResize", () => {
  const box = { x: 2, y: 4, w: 4, h: 8 };

  it("ouest : x et w varient en sens inverse", () => {
    expect(applyResize("w", box, 20, 0, 10, 10)).toEqual({ x: 4, y: 4, w: 2, h: 8 });
    expect(applyResize("w", box, -200, 0, 10, 10)).toEqual({ x: 0, y: 4, w: 6, h: 8 });
    expect(applyResize("w", box, 300, 0, 10, 10)).toEqual({ x: 5, y: 4, w: 1, h: 8 });
  });

  it("nord : y et h varient en sens inverse", () => {
    expect(applyResize("n", box, 0, 20, 10, 10)).toEqual({ x: 2, y: 6, w: 4, h: 6 });
    expect(applyResize("n", box, 0, -200, 10, 10)).toEqual({ x: 2, y: 0, w: 4, h: 12 });
  });

  it("est/sud : bords fixes et bornes basses respectées", () => {
    expect(applyResize("e", { x: 8, y: 0, w: 4, h: 4 }, 100, 0, 10, 10)).toEqual({
      x: 8,
      y: 0,
      w: 4,
      h: 4,
    });
    expect(applyResize("s", { x: 0, y: 190, w: 4, h: 4 }, 0, 1000, 10, 10)).toEqual({
      x: 0,
      y: 190,
      w: 4,
      h: 9,
    });
  });

  it("coin sud-est : les deux axes", () => {
    expect(applyResize("se", box, 10, 10, 10, 10)).toEqual({ x: 2, y: 4, w: 5, h: 9 });
  });
});

describe("keepIfFree", () => {
  const fields = [
    { id: "a", label: "A", kind: "text", layout: { x: 0, y: 0, w: 6, h: 4 } },
    { id: "b", label: "B", kind: "text", layout: { x: 6, y: 0, w: 6, h: 4 } },
  ] as TemplateField[];
  const current = { x: 6, y: 0, w: 6, h: 4 };

  it("garde la position précédente si le candidat est occupé", () => {
    expect(keepIfFree(fields, current, { x: 0, y: 0, w: 6, h: 4 }, 1)).toBe(current);
  });

  it("accepte un candidat libre", () => {
    const candidate = { x: 6, y: 4, w: 6, h: 4 };
    expect(keepIfFree(fields, current, candidate, 1)).toBe(candidate);
  });
});

describe("findFreeSpot", () => {
  it("descend sous un champ qui occupe la ligne", () => {
    const fields = [
      { id: "a", label: "A", kind: "text", layout: { x: 0, y: 0, w: 12, h: 4 } },
    ] as TemplateField[];
    expect(findFreeSpot(fields, 0, 0, 6, 4)).toEqual({ x: 0, y: 4 });
  });

  it("utilise la colonne libre sur la même ligne", () => {
    const fields = [
      { id: "a", label: "A", kind: "text", layout: { x: 0, y: 0, w: 6, h: 4 } },
    ] as TemplateField[];
    expect(findFreeSpot(fields, 0, 0, 6, 4)).toEqual({ x: 6, y: 0 });
  });
});
