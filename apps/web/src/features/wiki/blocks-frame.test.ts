import { describe, expect, it } from "vitest";
import {
  GRID_X,
  GRID_Y,
  SIZE_STATES,
  frameAttrSpecs,
  frameOf,
  frameStyle,
  isFloating,
  legacySize,
  parseFrameTokens,
  resizeFrame,
  sizeTextCls,
  snapPct,
  snapPx,
} from "./blocks-frame";

describe("SIZE_STATES", () => {
  it("cycle complet XS → XXL, valeurs uniques", () => {
    expect(SIZE_STATES.map((s) => s.label)).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    const values = SIZE_STATES.map((s) => s.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("frameOf", () => {
  it("bloc sans cadrage (contenu existant) = tout à null, taille md", () => {
    expect(frameOf({})).toEqual({ size: "", w: null, h: null, x: null, y: null });
    expect(isFloating(frameOf({}))).toBe(false);
  });

  it("lis les attributs et borne les valeurs hostiles", () => {
    expect(frameOf({ size: "xl", w: 50, h: 120, x: 24, y: 160 })).toEqual({
      size: "xl",
      w: 50,
      h: 120,
      x: 24,
      y: 160,
    });
    expect(frameOf({ size: "geant", w: 400, h: -10, x: 500, y: "200" })).toEqual({
      size: "",
      w: 100,
      h: 0,
      x: 100,
      y: 200,
    });
    expect(frameOf({ w: "50%", h: Number.NaN, x: "aucun" })).toEqual({
      size: "",
      w: null,
      h: null,
      x: null,
      y: null,
    });
  });
});

describe("tokens de classe (persistance via contentHtml)", () => {
  it("round trip attributs → classe → attributs", () => {
    const attrs = { size: "l", w: 40, h: 180, x: 24, y: 96 };
    const cls = [
      frameAttrSpecs.size.renderHTML(attrs),
      frameAttrSpecs.w.renderHTML(attrs),
      frameAttrSpecs.h.renderHTML(attrs),
      frameAttrSpecs.x.renderHTML(attrs),
      frameAttrSpecs.y.renderHTML(attrs),
    ]
      .map((a) => a.class ?? "")
      .filter(Boolean)
      .join(" ");
    expect(cls).toBe("blk-size-l blk-w40 blk-h180 blk-x24 blk-y96");
    expect(parseFrameTokens(cls)).toEqual(attrs);
    expect(frameOf(parseFrameTokens(cls))).toMatchObject(attrs);
  });

  it("valeur par défaut : aucune classe émise", () => {
    const empty = { size: "", w: null, h: null, x: null, y: null };
    expect(frameAttrSpecs.size.renderHTML(empty).class).toBeUndefined();
    expect(frameAttrSpecs.w.renderHTML(empty).class).toBeUndefined();
    expect(frameAttrSpecs.x.renderHTML(empty).class).toBeUndefined();
    expect(parseFrameTokens("")).toEqual({});
    expect(parseFrameTokens(null)).toEqual({});
  });

  it("classe inconnue ou token tronqué ignorés", () => {
    expect(parseFrameTokens("wiki-block blk-x")).toEqual({});
    expect(parseFrameTokens("wiki-block blk-w50")).toEqual({ w: 50 });
  });

  it("legacy data-size sm/lg des contenus anciens", () => {
    expect(legacySize("sm")).toBe("s");
    expect(legacySize("lg")).toBe("l");
    expect(legacySize("")).toBe("");
    expect(legacySize(null)).toBe("");
    expect(parseFrameTokens(`blk-size-${legacySize("lg")}`)).toEqual({ size: "l" });
  });
});

describe("frameStyle", () => {
  it("flux : largeur bornée au conteneur, jamais max-w-*", () => {
    expect(frameStyle(frameOf({ w: 50, h: 80 }))).toEqual({
      width: "min(100%, 50%)",
      minHeight: "80px",
    });
    expect(frameStyle(frameOf({}))).toBeUndefined();
    const css = JSON.stringify(frameStyle(frameOf({ w: 80 })));
    expect(css).not.toContain("max-width");
    expect(css).not.toContain("max-w");
  });

  it("position libre : absolu % / px", () => {
    expect(frameStyle(frameOf({ x: 8, y: 32, w: 60 }))).toEqual({
      width: "min(100%, 60%)",
      position: "absolute",
      left: "8%",
      top: "32px",
    });
  });
});

describe("snap de la grille", () => {
  it(`horizontal au pas de ${GRID_X} %, borné`, () => {
    expect(snapPct(11, 100)).toBe(8);
    expect(snapPct(13, 100)).toBe(16);
    expect(snapPct(-5, 100)).toBe(0);
    expect(snapPct(99, 92)).toBe(92);
  });

  it(`vertical au pas de ${GRID_Y} px, jamais négatif`, () => {
    expect(snapPx(40)).toBe(32);
    expect(snapPx(48)).toBe(64);
    expect(snapPx(-20)).toBe(0);
  });
});

describe("sizeTextCls", () => {
  it("échelle croissante et repli md", () => {
    expect(sizeTextCls("xs")).toBe("text-[0.65rem]");
    expect(sizeTextCls("xxl")).toBe("text-xl");
    expect(sizeTextCls("")).toBe("text-sm");
    expect(sizeTextCls("bogus")).toBe("text-sm");
  });
});

describe("resizeFrame (dimension à la souris)", () => {
  const start = { left: 100, top: 50, right: 300, bottom: 110 };
  const W = 1000;

  it("bord droit / bas / coin SE : pilote w % et h px, bornes appliquées", () => {
    expect(resizeFrame(frameOf({}), "r", start, 500, 0, W)).toEqual({ w: 40 });
    expect(resizeFrame(frameOf({}), "b", start, 0, 200, W)).toEqual({ h: 150 });
    expect(resizeFrame(frameOf({}), "se", start, 500, 200, W)).toEqual({ w: 40, h: 150 });
    expect(resizeFrame(frameOf({}), "r", start, 101, 0, W)).toEqual({ w: 4 });
    expect(resizeFrame(frameOf({}), "b", start, 0, 52, W)).toEqual({ h: 16 });
    expect(resizeFrame(frameOf({}), "r", start, 5000, 0, W)).toEqual({ w: 100 });
  });

  it("bord gauche / haut (bloc flottant) : déplace x/y en gardant le bord opposé", () => {
    expect(resizeFrame(frameOf({ x: 10, y: 64 }), "l", start, 50, 0, W)).toEqual({ x: 5, w: 25 });
    expect(resizeFrame(frameOf({ x: 10, y: 64 }), "t", start, 0, 80, W)).toEqual({ y: 80, h: 30 });
  });

  it("bloc en flux : aucun bord gauche/haut, conteneur invalide ignoré", () => {
    expect(resizeFrame(frameOf({}), "l", start, 50, 0, W)).toEqual({});
    expect(resizeFrame(frameOf({}), "t", start, 0, 80, W)).toEqual({});
    expect(resizeFrame(frameOf({ x: 10, y: 64 }), "r", start, 500, 0, 0)).toEqual({});
  });
});
