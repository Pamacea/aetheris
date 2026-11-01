import { describe, expect, it } from "vitest";
import {
  buildCharacteristicTemplate,
  PRESET_GAME_SYSTEMS,
  systemFieldId,
  systemPregenSchema,
  type CreateCustomGameSystemInput,
} from "@aetheris/shared";
import {
  handoutSeedsFromDefaults,
  loreSeedsFromDefaults,
  parseSystemImport,
  presetTemplateSeeds,
  presetsFromTemplates,
  systemExportPayload,
  templateSeedsFromDefaults,
  templatesForImportedSystem,
  wikifyLoreLinks,
} from "./system-logic";

const validSystem = {
  name: "Système des Cendres",
  description: "Fantasy sombre.",
  genre: "fantasy",
  characteristics: [
    { name: "Force", type: "number" },
    { name: "Vigueur", type: "counter" },
    { name: "Défense", type: "formula", formula: "force + vigueur" },
  ],
};

describe("parseSystemImport", () => {
  it("accepte un JSON valide et normalise les caractéristiques", () => {
    const result = parseSystemImport(JSON.stringify(validSystem));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Système des Cendres");
      expect(result.data.characteristics).toHaveLength(3);
    }
  });

  it("refuse un JSON malformé", () => {
    const result = parseSystemImport("{ nope");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/JSON invalide/);
  });

  it("refuse les clés inconnues (strict)", () => {
    const result = parseSystemImport({ ...validSystem, secret: "x" });
    expect(result.success).toBe(false);
  });

  it("refuse une formule absente sur le type formule", () => {
    const result = parseSystemImport({
      ...validSystem,
      characteristics: [{ name: "Défense", type: "formula" }],
    });
    expect(result.success).toBe(false);
  });

  it("refuse une formule sur un type non formule", () => {
    const result = parseSystemImport({
      ...validSystem,
      characteristics: [{ name: "Force", type: "number", formula: "force + 1" }],
    });
    expect(result.success).toBe(false);
  });

  it("refuse deux caractéristiques dont l'identifiant dérivé est identique", () => {
    const result = parseSystemImport({
      ...validSystem,
      characteristics: [
        { name: "Force", type: "number" },
        { name: "force", type: "number" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("refuse un import sans modèle ni caractéristique", () => {
    const result = parseSystemImport({ name: "Vide", genre: "autre" });
    expect(result.success).toBe(false);
  });

  it("borne la taille du fichier", () => {
    const result = parseSystemImport("x".repeat(200_001));
    expect(result.success).toBe(false);
  });
});

describe("aller-retour export → import", () => {
  const input: CreateCustomGameSystemInput = {
    name: "Système des Cendres",
    description: "Fantasy sombre.",
    genre: "fantasy",
    characteristics: [
      { name: "Force", type: "number" },
      { name: "Vigueur", type: "counter" },
      { name: "Défense", type: "formula", formula: "force + vigueur" },
    ],
  };

  it("réimporte le payload exporté par le builder sans perte", () => {
    const exported = systemExportPayload(input);
    expect(exported.assets).toEqual([]);
    const parsed = parseSystemImport(JSON.stringify(exported));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const characteristics = parsed.data.characteristics ?? [];
    expect(characteristics).toEqual(input.characteristics);
    expect(templatesForImportedSystem(parsed.data)).toEqual([
      buildCharacteristicTemplate(input.characteristics),
    ]);
  });

  it("rejette un export dont une caractéristique n'a pas de nom", () => {
    const exported = systemExportPayload({
      name: "Cassé",
      genre: "autre",
      characteristics: [{ name: "  ", type: "number" }],
    });
    expect(parseSystemImport(exported).success).toBe(false);
  });
});

describe("mapping système → modèles seedés", () => {
  it("convertit les caractéristiques en modèle « Personnage »", () => {
    const parsed = parseSystemImport(validSystem);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const seeds = templatesForImportedSystem(parsed.data);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.name).toBe("Personnage");
    expect(seeds[0]?.schema.fields.map((f) => f.id)).toEqual(["force", "vigueur", "defense"]);
    expect(seeds[0]?.schema.fields[2]).toMatchObject({
      kind: "formula",
      expr: "force + vigueur",
    });
  });

  it("préfère les modèles explicites aux caractéristiques", () => {
    const parsed = parseSystemImport({
      name: "Mixte",
      genre: "autre",
      characteristics: [{ name: "Force", type: "number" }],
      templates: [
        {
          name: "Fiche",
          schema: { fields: [{ id: "nom", label: "Nom", kind: "text" }] },
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(templatesForImportedSystem(parsed.data)[0]?.name).toBe("Fiche");
  });

  it("valide les modèles stockés en base", () => {
    const seeds = presetTemplateSeeds("dnd5e");
    expect(seeds).not.toBeNull();
    const parsed = templateSeedsFromDefaults(seeds);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.seeds.map((seed) => seed.name)).toContain("Personnage D&D 5e");
    }
  });

  it("rejette des modèles corrompus", () => {
    expect(templateSeedsFromDefaults({ nope: true }).success).toBe(false);
    expect(templateSeedsFromDefaults([{ name: "Sans schéma" }]).success).toBe(false);
  });
});

describe("presets officiels", () => {
  it("expose les systèmes demandés", () => {
    expect(PRESET_GAME_SYSTEMS.map((preset) => preset.id)).toEqual([
      "dnd5e",
      "cocth",
      "cyberpunk",
      "chroniques-oubliees",
      "pathfinder2e",
      "warhammer4",
    ]);
  });

  it("fournit modèles et assets valides pour chaque preset", () => {
    for (const preset of PRESET_GAME_SYSTEMS) {
      expect(preset.templates.length).toBeGreaterThan(0);
      expect(preset.assets.length).toBeGreaterThan(0);
      expect(templateSeedsFromDefaults(preset.templates).success).toBe(true);
    }
  });

  it("fournit un livret de règles et un handout seedables pour chaque preset", () => {
    for (const preset of PRESET_GAME_SYSTEMS) {
      const lore = loreSeedsFromDefaults(preset.lore);
      const handouts = handoutSeedsFromDefaults(preset.handouts);
      expect(lore.success).toBe(true);
      expect(handouts.success).toBe(true);
      if (!lore.success || !handouts.success) continue;
      expect(lore.seeds.some((note) => note.folder === "Règles")).toBe(true);
      expect(handouts.seeds.length).toBeGreaterThan(0);
      // `[[Titre]]` ne doit jamais atteindre le wiki tel quel.
      for (const note of lore.seeds) {
        expect(wikifyLoreLinks(note.contentHtml)).not.toContain("[[");
      }
    }
  });

  it("fournit des prétirés reliés à un modèle et une scène d'ouverture", () => {
    for (const preset of PRESET_GAME_SYSTEMS) {
      const names = new Set(preset.templates.map((template) => template.name));
      expect(preset.pregens.length).toBeGreaterThan(0);
      for (const pregen of preset.pregens) {
        expect(systemPregenSchema.safeParse(pregen).success).toBe(true);
        expect(names.has(pregen.template)).toBe(true);
        expect(Object.keys(pregen.data).length).toBeGreaterThan(0);
      }
      expect(preset.scene?.tokens.length).toBeGreaterThan(0);
    }
  });

  it("dérive un identifiant de champ stable et valide", () => {
    expect(systemFieldId("Défense")).toBe("defense");
    expect(systemFieldId("Points de vie")).toBe("points_de_vie");
    expect(systemFieldId("123")).toMatch(/^[a-z][a-z0-9_-]*$/);
  });
});

describe("presetsFromTemplates", () => {
  it("convertit les modèles seedés d'un système en presets du builder", () => {
    const seed = buildCharacteristicTemplate([{ name: "Force", type: "number" }]);
    const presets = presetsFromTemplates([seed]);
    expect(presets).toHaveLength(1);
    expect(presets[0]).toMatchObject({ id: "systeme-0", name: seed.name, schema: seed.schema });
  });

  it("ignore les entrées corrompues et une valeur non tableau", () => {
    const seed = buildCharacteristicTemplate([{ name: "Force", type: "number" }]);
    expect(presetsFromTemplates([seed, { name: "" }, 42])).toHaveLength(1);
    expect(presetsFromTemplates(null)).toEqual([]);
    expect(presetsFromTemplates("oops")).toEqual([]);
  });

  it("transporte le style du modèle", () => {
    const seed = {
      ...buildCharacteristicTemplate([{ name: "Force", type: "number" }]),
      customCss: ".x { color: red; }",
    };
    expect(presetsFromTemplates([seed])[0]?.customCss).toBe(".x { color: red; }");
  });
});
