import { describe, expect, it } from "vitest";
import { QUICK_CREATE_PRESETS, findTemplateByName } from "./template-quick-create-logic";

describe("création rapide de modèle", () => {
  it("expose les trois presets dans l'ordre attendu", () => {
    expect(QUICK_CREATE_PRESETS.map((p) => p.name)).toEqual([
      "Personnage",
      "Lieu",
      "Objet magique",
    ]);
  });

  it("retrouve un modèle existant sans tenir compte de la casse", () => {
    expect(findTemplateByName([{ id: "t1", name: " personnage " }], "Personnage")?.id).toBe("t1");
    expect(findTemplateByName([{ id: "t1", name: "PNJ" }], "Personnage")).toBeUndefined();
  });
});
