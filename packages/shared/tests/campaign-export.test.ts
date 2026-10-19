import { test } from "node:test";
import assert from "node:assert/strict";
// Import depuis dist/ : le script `test` rebuild avant de lancer les tests.
import {
  buildCampaignExport,
  campaignExportSchema,
  CAMPAIGN_EXPORT_VERSION,
} from "../dist/schemas/campaign-export.js";
import type { CampaignExportSource } from "../dist/schemas/campaign-export.js";

function source(): CampaignExportSource {
  return {
    campaign: {
      title: "Les Chroniques d'Aetheris",
      theme: "fantasy",
      gameSystem: "dnd5",
      enabledPlugins: ["combat", "journal"],
    },
    entities: [
      { title: "Loup des ombres", type: "bestiaire", data: {}, contentHtml: null, folder: null },
    ],
    templates: [{ name: "Fiche PJ", category: null, schema: { fields: [] } }],
    scene: null,
  };
}

function archive() {
  return { version: CAMPAIGN_EXPORT_VERSION, ...source() };
}

test("buildCampaignExport assemble une archive valide versionnée", () => {
  const out = buildCampaignExport(source());
  assert.equal(out.version, CAMPAIGN_EXPORT_VERSION);
  assert.equal(out.entities.length, 1);
  assert.equal(out.scene, null);
});

test("le schéma exige toutes les sections", () => {
  assert.equal(campaignExportSchema.safeParse({}).success, false);
  const s = archive();
  assert.equal(campaignExportSchema.safeParse({ ...s, campaign: undefined }).success, false);
  assert.equal(campaignExportSchema.safeParse({ ...s, entities: undefined }).success, false);
});

test("une autre version que la version courante est refusée", () => {
  assert.equal(campaignExportSchema.safeParse({ ...archive(), version: 2 }).success, false);
  assert.equal(campaignExportSchema.safeParse({ ...archive(), version: "1" }).success, false);
});

test("titres de campagne hors bornes refusés", () => {
  const base = archive();
  assert.equal(
    campaignExportSchema.safeParse({ ...base, campaign: { ...base.campaign, title: "" } }).success,
    false,
  );
  assert.equal(
    campaignExportSchema.safeParse({
      ...base,
      campaign: { ...base.campaign, title: "x".repeat(121) },
    }).success,
    false,
  );
});

test("bornes : plugins (50), templates (1000), entités (10000)", () => {
  const base = archive();
  assert.equal(
    campaignExportSchema.safeParse({
      ...base,
      campaign: { ...base.campaign, enabledPlugins: Array.from({ length: 51 }, () => "combat") },
    }).success,
    false,
  );
  assert.equal(
    campaignExportSchema.safeParse({
      ...base,
      templates: Array.from({ length: 1_001 }, () => ({ name: "t", category: null, schema: null })),
    }).success,
    false,
  );
  assert.equal(
    campaignExportSchema.safeParse({
      ...base,
      templates: Array.from({ length: 1_000 }, () => ({ name: "t", category: null, schema: null })),
    }).success,
    true,
  );
});

test("entité invalide (contentHtml non textuel) refusée", () => {
  const base = archive();
  assert.equal(
    campaignExportSchema.safeParse({
      ...base,
      entities: [{ title: "E", type: "note", data: {}, contentHtml: 42, folder: null }],
    }).success,
    false,
  );
});

test("buildCampaignExport throw ZodError sur source incohérente", () => {
  const s = source();
  s.campaign.title = "";
  assert.throws(() => buildCampaignExport(s));
});
