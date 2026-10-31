import { describe, expect, it } from "vitest";
import { PALETTE_GROUPS, filterPaletteGroups } from "./builder-palette-data";

const labels = (groups: ReturnType<typeof filterPaletteGroups>) =>
  groups.flatMap((g) => g.items.map((i) => i.label));

describe("filterPaletteGroups", () => {
  it("rend toute la palette sans requête", () => {
    expect(filterPaletteGroups(PALETTE_GROUPS, "  ")).toBe(PALETTE_GROUPS);
  });

  it("filtre sans tenir compte de la casse ni des accents", () => {
    expect(labels(filterPaletteGroups(PALETTE_GROUPS, "INVENTAIRE"))).toEqual(["Inventaire"]);
    expect(labels(filterPaletteGroups(PALETTE_GROUPS, "competences"))).toEqual(["Compétences"]);
    // La recherche couvre aussi les aides : « poids » apparaît dans les deux.
    expect(labels(filterPaletteGroups(PALETTE_GROUPS, "poids"))).toEqual(["Décimal", "Inventaire"]);
  });

  it("écarte les groupes vides sans muter la palette d'origine", () => {
    expect(filterPaletteGroups(PALETTE_GROUPS, "zzz")).toEqual([]);
    expect(PALETTE_GROUPS.flatMap((g) => g.items).length).toBeGreaterThan(0);
  });
});
