import { describe, expect, test } from "vitest";
import { resolveColor } from "./pixi-theme";

describe("resolveColor", () => {
  test("hex court et long", () => {
    expect(resolveColor("#abc", 0)).toBe(0xaabbcc);
    expect(resolveColor("#e7dcc6", 0)).toBe(0xe7dcc6);
    expect(resolveColor("#2a1f1499", 0)).toBe(0x2a1f14);
  });

  test("rgb()/rgba()", () => {
    expect(resolveColor("rgb(42, 31, 20)", 0)).toBe(0x2a1f14);
    expect(resolveColor("rgba(10 20 30 / 0.5)", 0)).toBe(0x0a141e);
  });

  test("entrée vide ou invalide → repli", () => {
    expect(resolveColor("", 0x123456)).toBe(0x123456);
    expect(resolveColor("var(--x)", 0x123456)).toBe(0x123456);
  });

  test("minLum : foreground de thème clair replié, sombre conservé", () => {
    // Posés sur la table #0b0907 : sous Parchemin le label serait illisible.
    expect(resolveColor("#2a1f14", 0xe7dcc6, 0.5)).toBe(0xe7dcc6);
    expect(resolveColor("#e7dcc6", 0x111111, 0.5)).toBe(0xe7dcc6);
    expect(resolveColor("#9c2f16", 0xe7dcc6, 0.5)).toBe(0xe7dcc6); // accent Parchemin
    // Seuil label/anneau (0.25 ≈ ratio 3:1 sur #0b0907) : Ember reste thématisé.
    expect(resolveColor("#dd5c33", 0x111111, 0.25)).toBe(0xdd5c33);
    expect(resolveColor("#2a1f14", 0xe7dcc6, 0.25)).toBe(0xe7dcc6);
  });
});
