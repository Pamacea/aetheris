import { describe, expect, it } from "vitest";
import { mergeCombatPatch } from "./template-combat-merge";

const keys = { hp: "hp", hpMax: "hpMax", ac: "ac" };

describe("mergeCombatPatch", () => {
  it("fusionne partiellement les clés fournies", () => {
    const values = { hp: 10, hpMax: 20, ac: 12, name: "Gobelin" };
    const next = mergeCombatPatch(values, keys, { hp: 4 });
    expect(next).not.toBe(values);
    expect(next).toEqual({ hp: 4, hpMax: 20, ac: 12, name: "Gobelin" });
  });

  it("applique zéro et null (PV remis à zéro)", () => {
    expect(mergeCombatPatch({ hp: 10 }, keys, { hp: 0 })).toEqual({ hp: 0 });
    expect(mergeCombatPatch({ hp: 10 }, keys, { hp: null })).toEqual({ hp: null });
  });

  it("retourne le même objet si le patch est vide", () => {
    const values = { hp: 10 };
    expect(mergeCombatPatch(values, keys, {})).toBe(values);
  });
});
