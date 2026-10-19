import { describe, expect, it } from "vitest";
import { hasLinkBetween, initialPositions, VIEW_H, VIEW_W } from "./layout";

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
