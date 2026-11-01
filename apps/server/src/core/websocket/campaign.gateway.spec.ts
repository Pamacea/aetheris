import { WsException } from "@nestjs/websockets";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { SceneState } from "@aetheris/shared";
import type { Socket } from "socket.io";
import { CampaignGateway } from "./campaign.gateway.js";
import type { PrismaService } from "../database/prisma.service.js";

/** Instancie le gateway avec des doubles minimaux + capture des emissions. */
function setup(opts: {
  member: { role: string } | null;
  scene: { id: string } | null;
  /** État persisté de la scène (`vttScene.state`). */
  state?: unknown;
  /** Ids d'Entity existantes (validation `noteId`). */
  entities?: string[];
  /** Rooms déjà rejointes par le socket (état `data.campaigns`). */
  campaigns?: string[];
  /** Fiche relue par `fiche:sync` (null = supprimée). */
  entity?: {
    id: string;
    title: string;
    type: string;
    data: unknown;
    gmOnly: boolean;
    assignees?: { userId: string }[];
  } | null;
  /** `jsonTemplate.schema` du template de la fiche. */
  templateSchema?: unknown;
  /** Autres sockets de la room (filtrage par socket). */
  remotes?: { id: string; userId?: string; rooms?: string[] }[];
}) {
  const emissions: { room: string; event: string; payload: unknown }[] = [];
  let persisted = 0;
  const prisma = {
    campaignMember: { findUnique: async () => opts.member },
    vttScene: {
      findUnique: async () => (opts.scene ? { ...opts.scene, state: opts.state ?? null } : null),
      upsert: async () => ({ id: "scene-1" }),
    },
    chatMessage: {
      create: async () => {
        persisted += 1;
        return { id: `msg-${persisted}` };
      },
    },
    entity: {
      // Prisma renvoie toujours le tableau (vide si non assignée).
      findFirst: async () =>
        opts.entity ? { ...opts.entity, assignees: opts.entity.assignees ?? [] } : null,
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.filter((id) => (opts.entities ?? []).includes(id)).map((id) => ({ id })),
    },
    jsonTemplate: {
      findFirst: async () => (opts.templateSchema ? { schema: opts.templateSchema } : null),
    },
  };
  const gateway = new CampaignGateway(prisma as unknown as PrismaService, new EventEmitter2());
  const emit = (room: string) => ({
    emit: (event: string, payload: unknown) => {
      emissions.push({ room, event, payload });
    },
  });
  const remoteSockets = (opts.remotes ?? []).map((r) => ({
    id: r.id,
    data: { userId: r.userId },
    rooms: new Set(r.rooms ?? []),
    emit: (event: string, payload: unknown) => {
      emissions.push({ room: `socket:${r.id}`, event, payload });
    },
  }));
  (gateway as unknown as { server: unknown }).server = {
    to: emit,
    in: (room: string) => ({
      fetchSockets: async () => remoteSockets.filter((r) => r.rooms.has(room)),
    }),
  };
  const joined: string[] = [];
  const socket = {
    data: {
      userId: "user-1",
      userName: "MJ",
      campaigns: opts.campaigns ?? [],
    },
    to: emit,
    join: async (room: string) => {
      joined.push(room);
    },
  } as unknown as Socket;
  return {
    gateway,
    emissions,
    socket,
    joined,
    remoteSockets,
    persisted: () => persisted,
  };
}

const CAMPAIGN = "11111111-1111-4111-8111-111111111111";

const grid = { type: "square", size: 32, offsetX: 0, offsetY: 0 };

/** Jeton minimal : le schéma complète ac/ownerId/noteId/sight. */
function token(over: Record<string, unknown> = {}) {
  return {
    id: "t1",
    x: 1,
    y: 2,
    size: 32,
    rot: 0,
    name: "Aventurier",
    color: "#c03a1b",
    hp: 10,
    hpMax: 10,
    ...over,
  };
}

function scene(over: Record<string, unknown> = {}) {
  return {
    tokens: [token({ ownerId: "user-1" })],
    walls: [
      {
        id: "w1",
        type: "wall",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      },
    ],
    grid,
    mapUrl: null,
    fog: { on: true, sightCells: 6 },
    theatreNotes: [],
    ...over,
  };
}

describe("CampaignGateway.sceneActivate", () => {
  const campaignId = "11111111-1111-4111-8111-111111111111";
  const sceneId = "22222222-2222-4222-8222-222222222222";

  it("émet scene:change avec la scène de la campagne et la session", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "GM" },
      scene: { id: sceneId },
    });
    await gateway.sceneActivate({ campaignId }, socket);
    expect(emissions).toEqual([
      {
        room: `campaign:${campaignId}`,
        event: "scene:change",
        payload: { sceneId, activatedBy: "user-1" },
      },
    ]);
  });

  it("refuse un joueur (réservé aux MJ)", async () => {
    const { gateway, socket } = setup({
      member: { role: "PLAYER" },
      scene: { id: sceneId },
    });
    await expect(gateway.sceneActivate({ campaignId }, socket)).rejects.toBeInstanceOf(WsException);
  });

  it("refuse un non-membre de la campagne", async () => {
    const { gateway, socket } = setup({ member: null, scene: { id: sceneId } });
    await expect(gateway.sceneActivate({ campaignId }, socket)).rejects.toBeInstanceOf(WsException);
  });

  it("reste silencieux quand la campagne n’a pas encore de scène", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "GM" },
      scene: null,
    });
    await gateway.sceneActivate({ campaignId }, socket);
    expect(emissions).toEqual([]);
  });
});

/**
 * Fige Date.now pendant `run` : la fenêtre de rate-limit devient
 * déterministe (sinon une frontière de seconde pendant la boucle flotte).
 */
function frozenNow<T>(run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => 1_700_000_000_000;
  return run().finally(() => {
    Date.now = real;
  });
}

describe("CampaignGateway.chatSend", () => {
  const campaignId = "11111111-1111-4111-8111-111111111111";

  it("refuse un membre révoqué même si la room est déjà rejointe", async () => {
    const { gateway, socket, persisted } = setup({
      member: null,
      scene: null,
      campaigns: [campaignId],
    });
    await expect(gateway.chatSend({ campaignId, content: "salut" }, socket)).rejects.toBeInstanceOf(
      WsException,
    );
    expect(persisted()).toBe(0);
  });

  it("persiste 5 messages puis ignore le 6e dans la seconde", async () => {
    const { gateway, socket, emissions, persisted } = setup({
      member: { role: "PLAYER" },
      scene: null,
      campaigns: [campaignId],
    });
    await frozenNow(async () => {
      for (let i = 0; i < 6; i++) {
        await gateway.chatSend({ campaignId, content: `msg ${i}` }, socket);
      }
    });
    expect(persisted()).toBe(5);
    expect(emissions.filter((e) => e.event === "chat:message")).toHaveLength(5);
  });
});

describe("CampaignGateway.tokenMove (propriété du jeton)", () => {
  const move = { campaignId: CAMPAIGN, tokenId: "t1", x: 5, y: 6 };

  it("refuse un joueur qui ne possède pas le jeton", async () => {
    const { gateway, socket, emissions } = setup({
      member: { role: "PLAYER" },
      scene: { id: "s1" },
      state: scene({ tokens: [token({ ownerId: "user-2" })] }),
      campaigns: [CAMPAIGN],
    });
    await expect(gateway.tokenMove(move, socket)).rejects.toBeInstanceOf(WsException);
    expect(emissions).toEqual([]);
  });

  it("refuse un jeton sans propriétaire", async () => {
    const { gateway, socket } = setup({
      member: { role: "PLAYER" },
      scene: { id: "s1" },
      state: scene({ tokens: [token({ ownerId: null })] }),
      campaigns: [CAMPAIGN],
    });
    await expect(gateway.tokenMove(move, socket)).rejects.toBeInstanceOf(WsException);
  });

  it("autorise le propriétaire et diffuse token:moved", async () => {
    const { gateway, socket, emissions } = setup({
      member: { role: "PLAYER" },
      scene: { id: "s1" },
      state: scene(),
      campaigns: [CAMPAIGN],
    });
    await gateway.tokenMove(move, socket);
    expect(emissions).toEqual([
      {
        room: `campaign:${CAMPAIGN}:gm`,
        event: "token:moved",
        payload: { tokenId: "t1", x: 5, y: 6 },
      },
    ]);
  });

  it("autorise le MJ sur un jeton non possédé", async () => {
    const { gateway, socket, emissions } = setup({
      member: { role: "GM" },
      scene: { id: "s1" },
      state: scene({ tokens: [token({ ownerId: "user-2" })] }),
      campaigns: [CAMPAIGN],
    });
    await gateway.tokenMove(move, socket);
    expect(emissions.filter((e) => e.event === "token:moved")).toHaveLength(1);
  });

  it("ne diffuse un déplacement qu’aux joueurs qui voient le jeton", async () => {
    const { gateway, socket, emissions } = setup({
      member: { role: "GM" },
      scene: { id: "s1" },
      state: scene({
        tokens: [token({ ownerId: null }), token({ id: "t2", ownerId: "user-3" })],
      }),
      campaigns: [CAMPAIGN],
      remotes: [
        { id: "r3", userId: "user-3", rooms: [`campaign:${CAMPAIGN}`] },
        { id: "r4", userId: "user-4", rooms: [`campaign:${CAMPAIGN}`] },
      ],
    });
    await gateway.tokenMove(move, socket);
    const rooms = emissions.map((e) => e.room);
    expect(rooms).toContain("socket:r3");
    expect(rooms).not.toContain("socket:r4");
  });
});

describe("CampaignGateway.sceneCommit (sécurité joueur)", () => {
  function player(over: { state?: unknown; entities?: string[] } = {}) {
    return setup({
      member: { role: "PLAYER" },
      scene: { id: "s1" },
      state: over.state ?? scene(),
      entities: over.entities,
      campaigns: [CAMPAIGN],
    });
  }

  it("refuse un joueur sans scène persistée", async () => {
    const { gateway, socket } = setup({
      member: { role: "PLAYER" },
      scene: null,
      campaigns: [CAMPAIGN],
    });
    await expect(
      gateway.sceneCommit({ campaignId: CAMPAIGN, state: scene() }, socket),
    ).rejects.toBeInstanceOf(WsException);
  });

  it("refuse toute modification des murs, de la grille, de la carte ou du brouillard", async () => {
    const cases = [
      { walls: [] },
      {
        walls: [
          {
            id: "w9",
            type: "secret",
            points: [
              { x: 1, y: 1 },
              { x: 2, y: 2 },
            ],
          },
        ],
      },
      { grid: { ...grid, size: 64 } },
      { mapUrl: "https://exemple.fr/carte.png" },
      { fog: { on: false, sightCells: 6 } },
    ];
    for (const over of cases) {
      const { gateway, socket } = player();
      await expect(
        gateway.sceneCommit({ campaignId: CAMPAIGN, state: scene(over) }, socket),
      ).rejects.toBeInstanceOf(WsException);
    }
  });

  it("refuse le déplacement ou le renommage d'un jeton possédé", async () => {
    for (const over of [{ x: 9 }, { y: 9 }, { name: "Gobelin" }, { size: 64 }, { rot: 90 }]) {
      const { gateway, socket } = player();
      await expect(
        gateway.sceneCommit(
          { campaignId: CAMPAIGN, state: scene({ tokens: [token(over)] }) },
          socket,
        ),
      ).rejects.toBeInstanceOf(WsException);
    }
  });

  it("refuse la modification d'un jeton non possédé", async () => {
    const { gateway, socket } = player({
      state: scene({ tokens: [token({ ownerId: "user-2" })] }),
    });
    await expect(
      gateway.sceneCommit(
        {
          campaignId: CAMPAIGN,
          state: scene({ tokens: [token({ ownerId: "user-2", hp: 1 })] }),
        },
        socket,
      ),
    ).rejects.toBeInstanceOf(WsException);
  });

  it("refuse le changement de propriétaire, d'identité de fiche, de couleur et d'image", async () => {
    const cases = [
      { ownerId: "user-2" },
      { noteId: "note-1" },
      { color: "#ffffff" },
      { imageUrl: "https://exemple.fr/jeton.png" },
    ];
    for (const over of cases) {
      const { gateway, socket } = player({ entities: ["note-1"] });
      await expect(
        gateway.sceneCommit(
          {
            campaignId: CAMPAIGN,
            state: scene({ tokens: [token({ ownerId: "user-1", ...over })] }),
          },
          socket,
        ),
      ).rejects.toBeInstanceOf(WsException);
    }
  });

  it("refuse l'ajout et la suppression de jetons", async () => {
    const added = player();
    await expect(
      added.gateway.sceneCommit(
        {
          campaignId: CAMPAIGN,
          state: scene({
            tokens: [token({ ownerId: "user-1" }), token({ id: "t2" })],
          }),
        },
        added.socket,
      ),
    ).rejects.toBeInstanceOf(WsException);

    const removed = player();
    await expect(
      removed.gateway.sceneCommit(
        { campaignId: CAMPAIGN, state: scene({ tokens: [] }) },
        removed.socket,
      ),
    ).rejects.toBeInstanceOf(WsException);
  });

  it("autorise le propriétaire à modifier les PV de son jeton", async () => {
    const { gateway, socket, emissions } = player();
    await expect(
      gateway.sceneCommit(
        {
          campaignId: CAMPAIGN,
          state: scene({ tokens: [token({ ownerId: "user-1", hp: 4 })] }),
        },
        socket,
      ),
    ).resolves.toEqual({ ok: true });
    expect(emissions.filter((e) => e.event === "scene:state")).toHaveLength(1);
    gateway.onModuleDestroy();
  });

  it("diffuse l’état filtré aux joueurs et l’état complet à la room MJ", async () => {
    const walls = [
      {
        id: "w1",
        type: "secret",
        points: [
          { x: 0, y: -1_000 },
          { x: 10, y: -1_000 },
        ],
      },
    ];
    const { gateway, socket, emissions } = setup({
      member: { role: "PLAYER" },
      scene: { id: "s1" },
      state: scene({ walls }),
      campaigns: [CAMPAIGN],
      remotes: [{ id: "r2", userId: "user-2", rooms: [`campaign:${CAMPAIGN}`] }],
    });
    await gateway.sceneCommit(
      {
        campaignId: CAMPAIGN,
        // Commit d'un client filtré : les murs secrets sont absents.
        state: scene({ walls: [], tokens: [token({ ownerId: "user-1", hp: 4 })] }),
      },
      socket,
    );
    const full = emissions.find(
      (e) => e.room === `campaign:${CAMPAIGN}:gm` && e.event === "scene:state",
    )?.payload as SceneState | undefined;
    const filtered = emissions.find((e) => e.room === "socket:r2" && e.event === "scene:state")
      ?.payload as SceneState | undefined;
    // Le commit joueur (même avec les murs complets) restitue les secrets ;
    // l'état filtré n'en expose ni l'existence ni la géométrie.
    expect(full?.walls[0]?.type).toBe("secret");
    expect(filtered?.walls).toEqual([]);
    expect(filtered?.theatreNotes).toEqual([]);
    expect(filtered?.tokens).toEqual([]);
    gateway.onModuleDestroy();
  });

  it("autorise le MJ à créer un jeton et modifier la scène", async () => {
    const { gateway, socket, emissions } = setup({
      member: { role: "GM" },
      scene: { id: "s1" },
      state: scene(),
      campaigns: [CAMPAIGN],
    });
    const state = scene({
      tokens: [token({ ownerId: "user-1" }), token({ id: "t2" })],
      walls: [],
      mapUrl: "https://exemple.fr/carte.png",
    });
    await expect(gateway.sceneCommit({ campaignId: CAMPAIGN, state }, socket)).resolves.toEqual({
      ok: true,
    });
    expect(emissions.filter((e) => e.event === "scene:state")).toHaveLength(1);
    gateway.onModuleDestroy();
  });
});

describe("CampaignGateway.sceneCommit (noteId ↔ Entity)", () => {
  it("refuse une fiche inexistante dans la campagne", async () => {
    const { gateway, socket } = setup({
      member: { role: "GM" },
      scene: { id: "s1" },
      state: scene(),
      entities: ["note-1"],
      campaigns: [CAMPAIGN],
    });
    await expect(
      gateway.sceneCommit(
        {
          campaignId: CAMPAIGN,
          state: scene({ tokens: [token({ noteId: "inconnue" })] }),
        },
        socket,
      ),
    ).rejects.toBeInstanceOf(WsException);
  });

  it("accepte une fiche existante", async () => {
    const { gateway, socket } = setup({
      member: { role: "GM" },
      scene: { id: "s1" },
      state: scene(),
      entities: ["note-1"],
      campaigns: [CAMPAIGN],
    });
    await expect(
      gateway.sceneCommit(
        {
          campaignId: CAMPAIGN,
          state: scene({ tokens: [token({ noteId: "note-1" })] }),
        },
        socket,
      ),
    ).resolves.toEqual({ ok: true });
    gateway.onModuleDestroy();
  });
});

describe("CampaignGateway.ficheSync", () => {
  const entityId = "33333333-3333-4333-8333-333333333333";
  const entity = {
    id: entityId,
    title: "Aldric",
    type: "personnage",
    data: { nom: "Aldric", pv: 7, pv_max: 20, ca: 15 },
    gmOnly: false,
  };
  // Ids volontairement différents des clés de la fiche : la résolution
  // exacte sur les données reste prioritaire, le schéma ne casse rien.
  const templateSchema = {
    fields: [
      { id: "vie_max", label: "Points de vie maximum", kind: "number" },
      { id: "classe", label: "Classe d'armure", kind: "number" },
    ],
  };

  it("émet fiche:combat avec les clés et le patch résolus", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "GM" },
      scene: null,
      entity,
      templateSchema,
      campaigns: [CAMPAIGN],
    });
    await gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket);
    expect(emissions).toEqual([
      {
        room: `campaign:${CAMPAIGN}`,
        event: "fiche:combat",
        payload: {
          entityId,
          keys: { hp: "pv", hpMax: "pv_max", ac: "ca" },
          patch: { name: "Aldric", hp: 7, hpMax: 20, ac: 15 },
        },
      },
    ]);
  });

  it("refuse un joueur pour une fiche secrète sans rien émettre", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "PLAYER" },
      scene: null,
      entity: { ...entity, gmOnly: true },
      templateSchema,
      campaigns: [CAMPAIGN],
    });
    await expect(
      gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket),
    ).rejects.toBeInstanceOf(WsException);
    expect(emissions).toEqual([]);
  });

  it("refuse un joueur ni assigné ni propriétaire d'un jeton lié", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "PLAYER" },
      scene: null,
      entity: { ...entity, assignees: [{ userId: "user-2" }] },
      templateSchema,
      campaigns: [CAMPAIGN],
    });
    await expect(
      gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket),
    ).rejects.toBeInstanceOf(WsException);
    expect(emissions).toEqual([]);
  });

  it("autorise un joueur assigné à la fiche", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "PLAYER" },
      scene: null,
      entity: { ...entity, assignees: [{ userId: "user-1" }] },
      templateSchema,
      campaigns: [CAMPAIGN],
    });
    await gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket);
    expect(emissions).toHaveLength(1);
  });

  it("ne diffuse une fiche secrète qu'à la room MJ", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "GM" },
      scene: null,
      entity: { ...entity, gmOnly: true },
      templateSchema,
      campaigns: [CAMPAIGN],
      remotes: [{ id: "player-1", userId: "user-2", rooms: [`campaign:${CAMPAIGN}`] }],
    });
    await gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket);
    const broadcasts = emissions.filter((e) => e.event === "fiche:combat");
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]?.room).toBe(`campaign:${CAMPAIGN}:gm`);
    expect(emissions.some((e) => e.room === "socket:player-1")).toBe(false);
  });

  it("cible MJ, assignés et propriétaires de jeton lié", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "GM" },
      scene: { id: "s1" },
      state: scene({
        tokens: [
          token({ ownerId: "owner", noteId: entityId }),
          token({ id: "t2", ownerId: "outsider" }),
        ],
      }),
      entity: { ...entity, assignees: [{ userId: "assignee" }] },
      templateSchema,
      campaigns: [CAMPAIGN],
      remotes: [
        { id: "assignee", userId: "assignee", rooms: [`campaign:${CAMPAIGN}`] },
        { id: "owner", userId: "owner", rooms: [`campaign:${CAMPAIGN}`] },
        {
          id: "outsider",
          userId: "outsider",
          rooms: [`campaign:${CAMPAIGN}`],
        },
        {
          id: "gm-2",
          userId: "gm-2",
          rooms: [`campaign:${CAMPAIGN}`, `campaign:${CAMPAIGN}:gm`],
        },
      ],
    });
    await gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket);
    expect(
      emissions.some((e) => e.room === `campaign:${CAMPAIGN}:gm` && e.event === "fiche:combat"),
    ).toBe(true);
    expect(
      emissions
        .filter((e) => e.event === "fiche:combat" && e.room.startsWith("socket:"))
        .map((e) => e.room)
        .sort(),
    ).toEqual(["socket:assignee", "socket:owner"]);
  });

  it("autorise le propriétaire d'un jeton lié, même non assigné", async () => {
    const { gateway, emissions, socket } = setup({
      member: { role: "PLAYER" },
      scene: { id: "s1" },
      state: scene({
        tokens: [token({ ownerId: "user-1", noteId: entityId })],
      }),
      entity: { ...entity, assignees: [] },
      templateSchema,
      campaigns: [CAMPAIGN],
    });
    await gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket);
    expect(emissions).toHaveLength(1);
  });

  it("rejoint la room à la demande si l’événement précède campaign:join", async () => {
    const { gateway, emissions, socket, joined } = setup({
      member: { role: "GM" },
      scene: null,
      entity,
      templateSchema,
      campaigns: [],
    });
    await gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket);
    expect(joined).toEqual([`campaign:${CAMPAIGN}`, `campaign:${CAMPAIGN}:gm`]);
    expect(emissions).toHaveLength(1);
  });

  it("refuse un non-membre même en rejoignant à la demande", async () => {
    const { gateway, socket, joined } = setup({
      member: null,
      scene: null,
      campaigns: [],
    });
    await expect(
      gateway.ficheSync({ campaignId: CAMPAIGN, entityId }, socket),
    ).rejects.toBeInstanceOf(WsException);
    expect(joined).toEqual([]);
  });
});

describe("CampaignGateway.diceRoll", () => {
  const campaignId = "11111111-1111-4111-8111-111111111111";

  it("refuse un non-membre (adhésion DB vérifiée par handler)", async () => {
    const { gateway, socket, emissions } = setup({
      member: null,
      scene: null,
      campaigns: [campaignId],
    });
    await expect(
      gateway.diceRoll({ campaignId, expression: "1d20" }, socket),
    ).rejects.toBeInstanceOf(WsException);
    expect(emissions).toEqual([]);
  });

  it("broadcast 5 jets puis ignore le 6e dans la seconde", async () => {
    const { gateway, socket, emissions } = setup({
      member: { role: "GM" },
      scene: null,
      campaigns: [campaignId],
    });
    await frozenNow(async () => {
      for (let i = 0; i < 6; i++) {
        await gateway.diceRoll({ campaignId, expression: "1d20" }, socket);
      }
    });
    expect(emissions.filter((e) => e.event === "dice:rolled")).toHaveLength(5);
  });
});
