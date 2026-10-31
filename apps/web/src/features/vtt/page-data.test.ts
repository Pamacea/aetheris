import { describe, expect, it, vi } from "vitest";
import { sceneStateSchema } from "@aetheris/shared";

const db = vi.hoisted(() => ({ sceneState: null as unknown }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: { findMany: async () => [] },
    vttScene: {
      findUnique: async () => (db.sceneState ? { state: db.sceneState } : null),
    },
    campaignMember: { findMany: async () => [] },
    entity: { findMany: async () => [] },
    jsonTemplate: { findMany: async () => [] },
  },
}));

import { loadVttPageData } from "./page-data";

const CAMPAIGN = "11111111-1111-4111-8111-111111111111";

const jeton = (over: Record<string, unknown>) => ({
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

function scene() {
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

describe("loadVttPageData (payload SSR du VTT)", () => {
  it("filtre la scène dès le premier rendu pour un joueur", async () => {
    db.sceneState = scene();
    const { initialScene } = await loadVttPageData(CAMPAIGN, "PLAYER", "joueur");
    expect(initialScene?.walls.map((w) => w.id)).toEqual(["wn"]);
    expect(initialScene?.walls.every((w) => w.type !== "secret")).toBe(true);
    expect(initialScene?.theatreNotes).toEqual([]);
    expect(initialScene?.tokens.map((t) => t.id)).toEqual(["moi", "vu"]);
  });

  it("le MJ conserve l'état complet", async () => {
    db.sceneState = scene();
    const { initialScene } = await loadVttPageData(CAMPAIGN, "GM", "mj");
    expect(initialScene?.walls.find((w) => w.id === "ws")?.type).toBe("secret");
    expect(initialScene?.theatreNotes).toEqual([{ id: "n1", title: "Embuscade" }]);
    expect(initialScene?.tokens.map((t) => t.id)).toEqual(["moi", "vu", "derriere", "cache"]);
  });
});
