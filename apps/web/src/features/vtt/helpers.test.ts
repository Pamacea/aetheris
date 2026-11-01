import { sceneTokenSchema } from "@aetheris/shared";
import { describe, expect, it } from "vitest";
import { canEditToken, clampHp, clampInt, newSceneToken, resolveMapUrl } from "./helpers";
import type { GridSettings } from "./types";

const grid: GridSettings = { type: "square", size: 64, offsetX: 0, offsetY: 0 };

describe("clampInt", () => {
  it("entier dans les bornes : tel quel, arrondi sinon", () => {
    expect(clampInt("12", 0, 99)).toBe(12);
    expect(clampInt("12.7", 0, 99)).toBe(13);
  });

  it("hors bornes : clampé", () => {
    expect(clampInt("-5", 0, 99)).toBe(0);
    expect(clampInt("400", 0, 99)).toBe(99);
  });

  it("saisie vide ou non numérique : null", () => {
    expect(clampInt("", 0, 99)).toBeNull();
    expect(clampInt("   ", 0, 99)).toBeNull();
    expect(clampInt("abc", 0, 99)).toBeNull();
  });
});

describe("clampHp", () => {
  it("borné entre 0 et le PV max", () => {
    expect(clampHp("7", 12)).toBe(7);
    expect(clampHp("-3", 12)).toBe(0);
    expect(clampHp("20", 12)).toBe(12);
  });

  it("jeton sans max : plafond de repli, min toujours 0", () => {
    expect(clampHp("30", null)).toBe(30);
    expect(clampHp("-1", null)).toBe(0);
    expect(clampHp("", 12)).toBeNull();
  });
});

describe("canEditToken", () => {
  const jeton = { ownerId: "u-1" };

  it("MJ : toujours", () => {
    expect(canEditToken(jeton, true, "u-2")).toBe(true);
    expect(canEditToken({ ownerId: null }, true, "u-2")).toBe(true);
  });

  it("joueur : uniquement ses propres jetons", () => {
    expect(canEditToken(jeton, false, "u-1")).toBe(true);
    expect(canEditToken(jeton, false, "u-2")).toBe(false);
    expect(canEditToken({ ownerId: null }, false, "u-1")).toBe(false);
  });
});

describe("resolveMapUrl", () => {
  it("accepte http(s) absolu et le normalise", () => {
    expect(resolveMapUrl("  https://exemple.fr/carte.png  ")).toBe("https://exemple.fr/carte.png");
    expect(resolveMapUrl("http://cdn.exemple.fr/x")).toBe("http://cdn.exemple.fr/x");
  });

  it("refuse tout le reste", () => {
    expect(resolveMapUrl("")).toBeNull();
    expect(resolveMapUrl("blob:https://x/123")).toBeNull();
    expect(resolveMapUrl("javascript:alert(1)")).toBeNull();
    expect(resolveMapUrl("/local/carte.png")).toBeNull();
    expect(resolveMapUrl("carte.png")).toBeNull();
  });
});

describe("newSceneToken", () => {
  it("jeton neuf sans PV/CA ni propriétaire", () => {
    const t = newSceneToken(grid, { x: 10, y: 20 }, "Gobelin", 0);
    expect(t).toMatchObject({
      hp: null,
      hpMax: null,
      ac: null,
      ownerId: null,
      noteId: null,
      imageUrl: null,
      sight: { enabled: true, rangeCells: null, type: "normal" },
    });
  });
});

describe("sceneTokenSchema (rétrocompatibilité)", () => {
  const ancien = {
    id: "t1",
    x: 10,
    y: 20,
    size: 32,
    rot: 0,
    name: "Aventurier",
    color: "#c03a1b",
    hp: 12,
    hpMax: 12,
  };

  it("payload d'avant ac/ownerId/noteId/sight : valeurs par défaut", () => {
    const parsed = sceneTokenSchema.parse(ancien);
    expect(parsed.ac).toBeNull();
    expect(parsed.ownerId).toBeNull();
    expect(parsed.noteId).toBeNull();
    expect(parsed.sight).toEqual({ enabled: true, rangeCells: null, type: "normal" });
  });

  it("ac/ownerId valides passent, ac hors bornes rejeté", () => {
    expect(sceneTokenSchema.parse({ ...ancien, ac: 15, ownerId: "u-1" })).toMatchObject({
      ac: 15,
      ownerId: "u-1",
    });
    expect(sceneTokenSchema.safeParse({ ...ancien, ac: 120 }).success).toBe(false);
  });
});
