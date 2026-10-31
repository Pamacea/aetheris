import { test } from "node:test";
import assert from "node:assert/strict";
import { sceneStateForViewer } from "../dist/scene-visibility.js";
import { sceneStateSchema } from "../dist/schemas/ws.js";

const jeton = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  x: 0,
  y: 0,
  size: 32,
  rot: 0,
  name: "Jeton",
  color: "#c03a1b",
  hp: null,
  hpMax: null,
  ...over,
});

function etat() {
  return sceneStateSchema.parse({
    tokens: [
      jeton({ id: "moi", ownerId: "joueur" }),
      jeton({ id: "vu", x: 32, ownerId: "autre" }),
      jeton({ id: "derriere", x: 100, ownerId: "autre" }),
      jeton({ id: "cache", x: 100_000, ownerId: "autre" }),
    ],
    walls: [
      {
        id: "wn",
        type: "wall",
        points: [
          { x: 0, y: -1_000 },
          { x: 10, y: -1_000 },
        ],
      },
      {
        id: "ws",
        type: "secret",
        points: [
          { x: 64, y: -100 },
          { x: 64, y: 100 },
        ],
      },
    ],
    grid: { type: "square", size: 32, offsetX: 0, offsetY: 0 },
    mapUrl: null,
    fog: { on: true, sightCells: 6 },
    theatreNotes: [{ id: "n1", title: "Embuscade" }],
  });
}

const owners = (state: ReturnType<typeof etat>) =>
  new Map(state.tokens.map((t) => [t.id, t.ownerId] as const));

test("MJ : état complet (murs secrets, notes de théâtre, tous les jetons)", () => {
  const state = etat();
  const view = sceneStateForViewer(state, {
    isGM: true,
    userId: "mj",
    tokenOwners: owners(state),
  });
  assert.equal(view, state);
  assert.equal(view.walls.find((w) => w.id === "ws")?.type, "secret");
  assert.deepEqual(view.theatreNotes, [{ id: "n1", title: "Embuscade" }]);
  assert.deepEqual(
    view.tokens.map((t) => t.id),
    ["moi", "vu", "derriere", "cache"],
  );
});

test("joueur : murs secrets retirés, notes vides, jetons hors vision absents", () => {
  const state = etat();
  const view = sceneStateForViewer(state, {
    isGM: false,
    userId: "joueur",
    tokenOwners: owners(state),
  });
  // La géométrie d'un mur secret ne doit pas atteindre le joueur.
  assert.deepEqual(
    view.walls.map((w) => w.id),
    ["wn"],
  );
  assert.ok(view.walls.every((w) => w.type !== "secret"));
  assert.deepEqual(view.theatreNotes, []);
  // `derriere` est occulté par le mur secret : l'occlusion le prend en compte.
  assert.deepEqual(
    view.tokens.map((t) => t.id),
    ["moi", "vu"],
  );
  // L'état source n'est pas muté (helper pur).
  assert.equal(state.walls.length, 2);
  assert.equal(state.walls.find((w) => w.id === "ws")?.type, "secret");
  assert.equal(state.tokens.length, 4);
});

test("joueur sans jeton : aucun jeton visible sous brouillard", () => {
  const state = etat();
  const view = sceneStateForViewer(state, {
    isGM: false,
    userId: "sans-jeton",
    tokenOwners: owners(state),
  });
  assert.deepEqual(view.tokens, []);
});

test("brouillard coupé : tous les jetons restent visibles, secrets masqués", () => {
  const state = sceneStateSchema.parse({
    ...etat(),
    fog: { on: false, sightCells: 6 },
  });
  const view = sceneStateForViewer(state, {
    isGM: false,
    userId: "joueur",
    tokenOwners: owners(state),
  });
  assert.deepEqual(
    view.tokens.map((t) => t.id),
    ["moi", "vu", "derriere", "cache"],
  );
  assert.deepEqual(
    view.walls.map((w) => w.id),
    ["wn"],
  );
  assert.deepEqual(view.theatreNotes, []);
});
