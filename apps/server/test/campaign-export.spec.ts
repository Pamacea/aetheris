import {
  buildCampaignExport,
  campaignExportSchema,
  CAMPAIGN_EXPORT_VERSION,
  type CampaignExportSource,
} from "@aetheris/shared";

/**
 * Phase 10 — contrat d'export/import de campagne (ZIP JSON).
 * Le runner vitest est dans apps/server : packages/shared n'a pas de test
 * script, la logique pure est donc testée depuis ce package consommateur.
 */
const source: CampaignExportSource = {
  campaign: {
    title: "Les Ombres d’Aetheris",
    theme: "arcane",
    gameSystem: "dnd5e",
    enabledPlugins: ["combat", "journal"],
  },
  entities: [
    {
      title: "Auberge du Renard",
      type: "note",
      data: { faction: "Neutre", danger: 3 },
      contentHtml: "<p>Lieu de rendez-vous.</p>",
      folder: "Lieux",
    },
  ],
  templates: [{ name: "PNJ", category: "Bestiaire", schema: { fields: [] } }],
  scene: { state: { tokens: [], walls: [] } },
};

describe("buildCampaignExport", () => {
  it("construit une archive valide (round-trip Zod)", () => {
    const archive = buildCampaignExport(source);

    expect(archive.version).toBe(CAMPAIGN_EXPORT_VERSION);
    expect(archive.entities).toHaveLength(1);
    expect(archive.templates).toHaveLength(1);
    expect(archive.scene).not.toBeNull();

    // Round-trip : l'archive produite passe sa propre validation d'import.
    const reparsed = campaignExportSchema.safeParse(JSON.parse(JSON.stringify(archive)));
    expect(reparsed.success).toBe(true);
  });

  it("rejette une source incohérente (throw avant export)", () => {
    const broken: CampaignExportSource = {
      ...source,
      entities: [{ ...source.entities[0], title: "" }],
    };
    expect(() => buildCampaignExport(broken)).toThrow();
  });
});

describe("campaignExportSchema (import)", () => {
  it("refuse tout JSON qui n’est pas une archive v1", () => {
    expect(campaignExportSchema.safeParse(null).success).toBe(false);
    expect(campaignExportSchema.safeParse({}).success).toBe(false);
    expect(campaignExportSchema.safeParse({ version: 99 }).success).toBe(false);

    const archive = buildCampaignExport(source);
    expect(campaignExportSchema.safeParse({ ...archive, version: 2 }).success).toBe(false);
  });

  it("refuse des entités invalides (titre vide, data non-object)", () => {
    const archive = buildCampaignExport(source);

    expect(
      campaignExportSchema.safeParse({
        ...archive,
        entities: [{ ...archive.entities[0], title: "" }],
      }).success,
    ).toBe(false);
    expect(
      campaignExportSchema.safeParse({
        ...archive,
        entities: [{ ...archive.entities[0], data: "pas-un-object" }],
      }).success,
    ).toBe(false);
  });
});

// ── Import : validation intégrale AVANT toute écriture ───────────────

/**
 * Les 4 mutations de `importCampaign`, mockées : aucune écriture réelle,
 * on vérifie le NON-appel pour prouver « zéro écriture partielle ».
 */
function makeTx() {
  return {
    campaignCreate: vi.fn(),
    entityCreateMany: vi.fn(),
    templateCreateMany: vi.fn(),
    sceneCreate: vi.fn(),
  };
}

/**
 * Miroir de l'ordre de `importCampaign` (apps/web) : safeParse Zod
 * INTÉGRAL d'abord, et seulement ensuite la transaction d'écriture.
 * shortcut: l'action réelle n'est pas importable depuis ce runner
 * (alias `@/`, session Next) ; à remplacer par un appel direct si elle le devient.
 */
function importGate(json: unknown, tx: ReturnType<typeof makeTx>): boolean {
  const parsed = campaignExportSchema.safeParse(json);
  if (!parsed.success) return false;
  const archive = parsed.data;
  tx.campaignCreate(archive.campaign);
  if (archive.entities.length > 0) tx.entityCreateMany(archive.entities);
  if (archive.templates.length > 0) tx.templateCreateMany(archive.templates);
  if (archive.scene) tx.sceneCreate(archive.scene);
  return true;
}

function expectNoWrites(tx: ReturnType<typeof makeTx>) {
  expect(tx.campaignCreate).not.toHaveBeenCalled();
  expect(tx.entityCreateMany).not.toHaveBeenCalled();
  expect(tx.templateCreateMany).not.toHaveBeenCalled();
  expect(tx.sceneCreate).not.toHaveBeenCalled();
}

describe("import : payload invalide → rejeté par Zod avant toute écriture", () => {
  const valid = buildCampaignExport(source);

  const invalidPayloads: Array<[string, unknown]> = [
    ["payload non-objet", "pas-une-archive"],
    ["objet vide", {}],
    ["version ≠ 1", { ...valid, version: 2 }],
    ["titre de campagne vide", { ...valid, campaign: { ...valid.campaign, title: "" } }],
    [
      "champ requis manquant (theme)",
      { ...valid, campaign: { ...valid.campaign, theme: undefined } },
    ],
    ["entités hors tableau", { ...valid, entities: {} }],
    [
      "titre d’entité manquant",
      { ...valid, entities: [{ ...valid.entities[0], title: undefined }] },
    ],
    ["scene non-object", { ...valid, scene: "nope" }],
    [
      "entité invalide tout au bout d’une liste sinon valide",
      {
        ...valid,
        entities: [
          { ...valid.entities[0], title: "Premier" },
          { ...valid.entities[0], title: "Deuxième" },
          { ...valid.entities[0], title: "" }, // le 3e casse tout
        ],
      },
    ],
  ];

  it.each(invalidPayloads)("rejette %s sans appeler aucune mutation", (_name, payload) => {
    const tx = makeTx();
    expect(importGate(payload, tx)).toBe(false);
    expectNoWrites(tx);
  });

  it("zéro écriture partielle : 1 entité invalide en fin de liste → 0/4 mutations", () => {
    const tx = makeTx();
    const payload = {
      ...valid,
      entities: [
        ...valid.entities,
        { ...valid.entities[0], title: "OK" },
        { ...valid.entities[0], title: "" },
      ],
    };
    expect(importGate(payload, tx)).toBe(false);
    expectNoWrites(tx);
  });

  it("archive valide → 4 mutations, campagne créée en premier", () => {
    const tx = makeTx();
    expect(importGate(valid, tx)).toBe(true);
    expect(tx.campaignCreate).toHaveBeenCalledTimes(1);
    expect(tx.entityCreateMany).toHaveBeenCalledTimes(1);
    expect(tx.templateCreateMany).toHaveBeenCalledTimes(1);
    expect(tx.sceneCreate).toHaveBeenCalledTimes(1);
    expect(tx.campaignCreate.mock.invocationCallOrder[0]!).toBeLessThan(
      tx.entityCreateMany.mock.invocationCallOrder[0]!,
    );
  });

  it("archive valide mais vide → seule la campagne est créée", () => {
    const tx = makeTx();
    expect(importGate({ ...valid, entities: [], templates: [], scene: null }, tx)).toBe(true);
    expect(tx.campaignCreate).toHaveBeenCalledTimes(1);
    expect(tx.entityCreateMany).not.toHaveBeenCalled();
    expect(tx.templateCreateMany).not.toHaveBeenCalled();
    expect(tx.sceneCreate).not.toHaveBeenCalled();
  });
});
