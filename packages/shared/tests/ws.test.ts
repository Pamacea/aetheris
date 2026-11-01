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

test("murs : l'ancien tableau de points est migré en mur plein à id stable", () => {
  const a = sceneStateSchema.parse(etat());
  const b = sceneStateSchema.parse(etat());
  assert.equal(a.walls[0].type, "wall");
  assert.equal(a.walls[0].id, b.walls[0].id);
  assert.deepEqual(a.walls[0].points, [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ]);
});

test("murs : styles acceptés, type inconnu refusé", () => {
  const mur = {
    id: "w1",
    type: "secret",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  };
  const ok = sceneStateSchema.safeParse(etat({ walls: [mur] }));
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.walls[0].type, "secret");
  for (const type of ["wall", "stone", "cave", "wood", "window"]) {
    const r = sceneStateSchema.safeParse(etat({ walls: [{ ...mur, type }] }));
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.walls[0].type, type);
  }
  assert.equal(
    sceneStateSchema.safeParse(etat({ walls: [{ ...mur, type: "porte" }] })).success,
    false,
  );
  assert.equal(
    sceneStateSchema.safeParse(etat({ walls: [{ ...mur, points: [] }] })).success,
    false,
  );
});

test("mapUrl : http(s) conservé, tout le reste normalisé en null", () => {
  const ok = sceneStateSchema.parse(etat({ mapUrl: "https://exemple.fr/carte.png" }));
  assert.equal(ok.mapUrl, "https://exemple.fr/carte.png");
  for (const bad of [
    "blob:https://exemple.fr/123",
    "javascript:alert(1)",
    "/local/carte.png",
    "carte.png",
  ]) {
    const r = sceneStateSchema.safeParse(etat({ mapUrl: bad }));
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.mapUrl, null);
  }
});

test("jeton : vision par défaut (portée globale) et champs bornés", () => {
  const d = sceneStateSchema.parse(etat());
  assert.deepEqual(d.tokens[0].sight, { enabled: true, rangeCells: null, type: "normal" });
  assert.equal(d.tokens[0].noteId, null);
  assert.equal(
    sceneStateSchema.safeParse(
      etat({ tokens: [{ ...jeton, sight: { enabled: false, rangeCells: 0, type: "cone" } }] }),
    ).success,
    false,
  );
  assert.equal(
    sceneStateSchema.safeParse(
      etat({ tokens: [{ ...jeton, sight: { enabled: false, rangeCells: 3, type: "cone" } }] }),
    ).success,
    true,
  );
});

test("jeton : lumière désactivée par défaut, portée bornée 1 → 60", () => {
  const d = sceneStateSchema.parse(etat());
  assert.deepEqual(d.tokens[0].light, { enabled: false, radiusCells: null });
  const on = sceneStateSchema.parse(
    etat({ tokens: [{ ...jeton, light: { enabled: true, radiusCells: 12 } }] }),
  );
  assert.deepEqual(on.tokens[0].light, { enabled: true, radiusCells: 12 });
  for (const radiusCells of [0, 61, 2.5]) {
    assert.equal(
      sceneStateSchema.safeParse(
        etat({ tokens: [{ ...jeton, light: { enabled: true, radiusCells } }] }),
      ).success,
      false,
    );
  }
  assert.equal(
    sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, light: { enabled: "oui" } }] })).success,
    false,
  );
});

test("jeton : imageUrl absent → null, http(s) conservé, le reste normalisé", () => {
  const d = sceneStateSchema.parse(etat());
  assert.equal(d.tokens[0].imageUrl, null);
  for (const ok of ["https://exemple.fr/jeton.png", "http://cdn.exemple.fr/jeton.webp"]) {
    const r = sceneStateSchema.parse(etat({ tokens: [{ ...jeton, imageUrl: ok }] }));
    assert.equal(r.tokens[0].imageUrl, ok);
  }
  for (const bad of [
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "blob:https://exemple.fr/123",
    "/local/jeton.png",
    "jeton.png",
    `https://exemple.fr/${"a".repeat(2_050)}`,
  ]) {
    const r = sceneStateSchema.safeParse(etat({ tokens: [{ ...jeton, imageUrl: bad }] }));
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.tokens[0].imageUrl, null);
  }
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
