import { describe, expect, it } from "vitest";
import { resolveJet } from "./jet";

describe("resolveJet", () => {
  it("lance la notation de dés du moteur partagé", () => {
    const r = resolveJet("1d20+3");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total).toBeGreaterThanOrEqual(4);
      expect(r.total).toBeLessThanOrEqual(23);
      expect(r.detail).toMatch(/^\d+$/);
    }
  });

  it("tombe sur evaluateFormula pour l'arithmétique pure", () => {
    const r = resolveJet("max(4, 9) + 1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total).toBe(10);
      expect(r.detail).toBe("formule");
    }
  });

  it("refuse une expression illisible (jamais d'évaluation sauvage)", () => {
    const r = resolveJet("process.exit(1)");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});
