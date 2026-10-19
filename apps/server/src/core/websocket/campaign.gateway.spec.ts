import { WsException } from "@nestjs/websockets";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Socket } from "socket.io";
import { CampaignGateway } from "./campaign.gateway.js";
import type { PrismaService } from "../database/prisma.service.js";

/** Instancie le gateway avec des doubles minimaux + capture des emissions. */
function setup(opts: {
  member: { role: string } | null;
  scene: { id: string } | null;
  /** Rooms déjà rejointes par le socket (état `data.campaigns`). */
  campaigns?: string[];
}) {
  const emissions: { room: string; event: string; payload: unknown }[] = [];
  let persisted = 0;
  const prisma = {
    campaignMember: { findUnique: async () => opts.member },
    vttScene: { findUnique: async () => opts.scene },
    chatMessage: {
      create: async () => {
        persisted += 1;
        return { id: `msg-${persisted}` };
      },
    },
  };
  const gateway = new CampaignGateway(prisma as unknown as PrismaService, new EventEmitter2());
  (gateway as unknown as { server: unknown }).server = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        emissions.push({ room, event, payload });
      },
    }),
  };
  const socket = {
    data: {
      userId: "user-1",
      userName: "MJ",
      campaigns: opts.campaigns ?? [],
    },
  } as unknown as Socket;
  return { gateway, emissions, socket, persisted: () => persisted };
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
