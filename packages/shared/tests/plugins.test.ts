import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pluginEventRequestSchema,
  pluginEventSchema,
  pluginIdSchema,
  PLUGIN_CATALOG,
} from "../dist/schemas/plugins.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

function demande(over: Record<string, unknown> = {}) {
  return {
    campaignId: UUID,
    pluginId: "combat",
    type: "initiative:committed",
    payload: {},
    ...over,
  };
}

test("pluginIdSchema accepte tout le catalogue, refuse l'inconnu", () => {
  for (const p of PLUGIN_CATALOG) {
    assert.equal(pluginIdSchema.safeParse(p.id).success, true, p.id);
  }
  assert.equal(pluginIdSchema.safeParse("combatx").success, false);
  assert.equal(pluginIdSchema.safeParse("").success, false);
});

test("la campagne doit être un UUID", () => {
  assert.equal(pluginEventRequestSchema.safeParse(demande()).success, true);
  assert.equal(pluginEventRequestSchema.safeParse(demande({ campaignId: "nawak" })).success, false);
});

test("type du plugin : borné 1 → 64 caractères", () => {
  assert.equal(pluginEventRequestSchema.safeParse(demande({ type: "" })).success, false);
  assert.equal(pluginEventRequestSchema.safeParse(demande({ type: "x".repeat(64) })).success, true);
  assert.equal(
    pluginEventRequestSchema.safeParse(demande({ type: "x".repeat(65) })).success,
    false,
  );
});

test("payload borné : chaîne 4000 max", () => {
  assert.equal(
    pluginEventRequestSchema.safeParse(demande({ payload: "x".repeat(4_000) })).success,
    true,
  );
  assert.equal(
    pluginEventRequestSchema.safeParse(demande({ payload: "x".repeat(4_001) })).success,
    false,
  );
  assert.equal(pluginEventRequestSchema.safeParse(demande({ payload: 12 })).success, true);
  assert.equal(pluginEventRequestSchema.safeParse(demande({ payload: null })).success, true);
  assert.equal(pluginEventRequestSchema.safeParse(demande({ payload: true })).success, true);
  assert.equal(pluginEventRequestSchema.safeParse(demande({ payload: undefined })).success, false);
});

test("payload borné : tableau 200 max, clés 128 max", () => {
  assert.equal(
    pluginEventRequestSchema.safeParse(demande({ payload: Array.from({ length: 201 }, () => 1) }))
      .success,
    false,
  );
  assert.equal(
    pluginEventRequestSchema.safeParse(demande({ payload: Array.from({ length: 200 }, () => 1) }))
      .success,
    true,
  );
  const cleLongue: Record<string, unknown> = {};
  cleLongue["k".repeat(129)] = 1;
  assert.equal(pluginEventRequestSchema.safeParse(demande({ payload: cleLongue })).success, false);
});

test("pluginEventSchema (S→C) : fromName exigé et borné", () => {
  const base = { pluginId: "combat", type: "audio:state", payload: {}, fromName: "Bruno" };
  assert.equal(pluginEventSchema.safeParse(base).success, true);
  assert.equal(pluginEventSchema.safeParse({ ...base, fromName: "" }).success, false);
  assert.equal(pluginEventSchema.safeParse({ ...base, fromName: "x".repeat(81) }).success, false);
  assert.equal(pluginEventSchema.safeParse({ ...base, fromName: undefined }).success, false);
});
