import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chatSendSchema,
  diceRollRequestSchema,
  sceneCommitSchema,
  sceneStateSchema,
} from "../dist/schemas/ws.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

const grille = { type: "square", size: 32, offsetX: 0, offsetY: 0 };

const jeton = {
  id: "t1",
  x: 10,
  y: 20,
  size: 32,
  rot: 0,
  name: "Aventurier",
  color: "#c03a1b",
  hp: 12,
  hpMax: 12,
};

function etat(over: Record<string, unknown> = {}) {
  return {
    tokens: [jeton],
    walls: [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    ],
    grid: grille,
    mapUrl: null,
    fog: { on: true, sightCells: 6 },
    ...over,
  };
}

test("un état de scène valide passe", () => {
  assert.equal(sceneStateSchema.safeParse(etat()).success, true);
});

test("theatreNotes absent : défaut [] (payloads antérieurs valides)", () => {
  const r = sceneStateSchema.safeParse(etat({ theatreNotes: undefined }));
  assert.equal(r.success, true);
  if (r.success) assert.deepEqual(r.data.theatreNotes, []);
});

test("fog.sightCells borné 1 → 100", () => {
  assert.equal(
    sceneStateSchema.safeParse(etat({ fog: { on: true, sightCells: 0 } })).success,
    false,
  );
  assert.equal(
    sceneStateSchema.safeParse(etat({ fog: { on: true, sightCells: 1 } })).success,
    true,
  );
  assert.equal(
    sceneStateSchema.safeParse(etat({ fog: { on: true, sightCells: 101 } })).success,
    false,
  );
});

test("grille.size borné 8 → 512", () => {
  assert.equal(sceneStateSchema.safeParse(etat({ grid: { ...grille, size: 7 } })).success, false);
  assert.equal(sceneStateSchema.safeParse(etat({ grid: { ...grille, size: 513 } })).success, false);
  assert.equal(sceneStateSchema.safeParse(etat({ grid: { ...grille, size: 8 } })).success, true);
});

test("jeton : couleur hexadécimale imposée", () => {
  assert.equal(
    sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, color: "rouge" }] })).success,
    false,
  );
  assert.equal(
    sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, color: "#a1b2c3" }] })).success,
    true,
  );
});

test("jeton : size borné 4 → 1024", () => {
  assert.equal(
    sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, size: 3 }] })).success,
    false,
  );
  assert.equal(
    sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, size: 1_025 }] })).success,
    false,
  );
  assert.equal(sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, size: 4 }] })).success, true);
});

test("500 jetons max, 501 refusés", () => {
  const plein = Array.from({ length: 500 }, (_, i) => ({ ...jeton, id: `t${i}` }));
  assert.equal(sceneStateSchema.safeParse(etat({ tokens: plein })).success, true);
  assert.equal(
    sceneStateSchema.safeParse(etat({ tokens: [...plein, { ...jeton, id: "t500" }] })).success,
    false,
  );
});

test("sceneCommit exige une campagne UUID", () => {
  assert.equal(sceneCommitSchema.safeParse({ campaignId: UUID, state: etat() }).success, true);
  assert.equal(sceneCommitSchema.safeParse({ state: etat() }).success, false);
  assert.equal(sceneCommitSchema.safeParse({ campaignId: "nawak", state: etat() }).success, false);
});

test("jets et chat : expression / contenu bornés", () => {
  assert.equal(
    diceRollRequestSchema.safeParse({ campaignId: UUID, expression: "" }).success,
    false,
  );
  assert.equal(
    diceRollRequestSchema.safeParse({ campaignId: UUID, expression: "x".repeat(101) }).success,
    false,
  );
  assert.equal(
    diceRollRequestSchema.safeParse({ campaignId: UUID, expression: "2d6+3" }).success,
    true,
  );
  assert.equal(chatSendSchema.safeParse({ campaignId: UUID, content: "" }).success, false);
  assert.equal(
    chatSendSchema.safeParse({ campaignId: UUID, content: "x".repeat(4_001) }).success,
    false,
  );
  assert.equal(chatSendSchema.safeParse({ campaignId: UUID, content: "salut" }).success, true);
});
