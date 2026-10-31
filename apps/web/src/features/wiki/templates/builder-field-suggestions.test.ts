import { describe, expect, it } from "vitest";
import type { TemplateField } from "@aetheris/shared";
import { buildFieldSuggestions } from "./builder-field-suggestions";

const ids = (fields: TemplateField[], currentId: string, token: string) =>
  buildFieldSuggestions(fields, currentId, token).map((s) => s.id);

const inventaire: TemplateField = {
  id: "inventaire",
  label: "Inventaire",
  kind: "inventory",
  columns: [
    { id: "objet", label: "Objet", type: "tag" },
    { id: "quantite", label: "Quantité", type: "number" },
    { id: "poids", label: "Poids", type: "number" },
  ],
};

describe("buildFieldSuggestions", () => {
  it("expose les agrégats d'un champ inventory", () => {
    expect(ids([inventaire], "charge", "inventaire")).toEqual([
      "inventaire",
      "inventaire_n",
      "inventaire_quantite",
      "inventaire_poids",
    ]);
  });

  it("ne duplique pas une clé d'agrégat déjà prise par un id de champ", () => {
    const champs: TemplateField[] = [
      inventaire,
      { id: "inventaire_poids", label: "Poids total", kind: "number" },
    ];
    expect(ids(champs, "charge", "inventaire_poids")).toEqual(["inventaire_poids"]);
  });

  it("ignore les colonnes non numériques", () => {
    expect(ids([inventaire], "charge", "inventaire_objet")).toEqual([]);
  });

  it("ne propose rien sans saisie", () => {
    expect(buildFieldSuggestions([inventaire], "charge", "")).toEqual([]);
  });
});
