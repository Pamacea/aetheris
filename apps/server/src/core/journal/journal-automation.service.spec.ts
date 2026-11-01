import { Logger } from "@nestjs/common";
import { JournalAutomationService } from "./journal-automation.service.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { PluginRegistryService } from "../plugins/plugin-registry.service.js";

interface Entry {
  campaignId: string;
  title: string;
  content: string;
  shared: boolean;
}

/** Instancie le service avec des doubles minimaux (pas de Nest TestingModule). */
function setup(opts: { enabled: boolean; createError?: Error }) {
  const entries: Entry[] = [];
  const prisma = {
    journalEntry: {
      create: async ({ data }: { data: Entry }) => {
        if (opts.createError) throw opts.createError;
        entries.push(data);
        return data;
      },
    },
  } as unknown as PrismaService;
  const plugins = {
    isEnabled: async () => opts.enabled,
  } as unknown as PluginRegistryService;
  return { service: new JournalAutomationService(prisma, plugins), entries };
}

const CAMPAIGN = "11111111-1111-4111-8111-111111111111";

const roll = {
  expression: "1d20",
  results: [15],
  total: 15,
  rollerName: "Aria",
  seed: 421_337,
};

describe("JournalAutomationService", () => {
  it("n'écrit rien quand le module journal est désactivé", async () => {
    const { service, entries } = setup({ enabled: false });
    await service.onDiceRolled({ campaignId: CAMPAIGN, payload: roll });
    expect(entries).toHaveLength(0);
  });

  it("journalise un jet en entrée partagée, sans payload brut", async () => {
    const { service, entries } = setup({ enabled: true });
    await service.onDiceRolled({ campaignId: CAMPAIGN, payload: roll });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ campaignId: CAMPAIGN, shared: true });
    expect(entries[0]?.title).toBe("Jet — Aria");
    expect(entries[0]?.content).toContain("1d20 → 15");
    expect(entries[0]?.content).not.toContain(JSON.stringify(roll));
    expect(entries[0]?.content).not.toContain("seed");
  });

  it("journalise un événement combat en entrée MJ, sans payload", async () => {
    const { service, entries } = setup({ enabled: true });
    const event = {
      campaignId: CAMPAIGN,
      pluginId: "combat",
      type: "initiative:committed",
      fromName: "MJ",
      payload: { hp: 3, conditions: ["étourdi"] },
    };
    await service.onPluginEvent(event);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ shared: false });
    expect(entries[0]?.title).toBe("Combat — initiative:committed");
    expect(entries[0]?.content).not.toContain("hp");
    expect(entries[0]?.content).not.toContain(JSON.stringify(event.payload));
  });

  it("ignore les événements excédentaires dans la même seconde", async () => {
    const { service, entries } = setup({ enabled: true });
    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    try {
      await service.onDiceRolled({ campaignId: CAMPAIGN, payload: roll });
      await service.onSceneActivated({
        campaignId: CAMPAIGN,
        userId: "user-1",
        userName: "MJ",
      });
      expect(entries).toHaveLength(1);
      now.mockReturnValue(1_700_000_001_000);
      await service.onSceneActivated({
        campaignId: CAMPAIGN,
        userId: "user-1",
        userName: "MJ",
      });
      expect(entries).toHaveLength(2);
    } finally {
      now.mockRestore();
    }
  });

  it("absorbe une erreur d'écriture sans la propager", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    try {
      const { service, entries } = setup({
        enabled: true,
        createError: new Error("boom"),
      });
      await expect(
        service.onDiceRolled({ campaignId: CAMPAIGN, payload: roll }),
      ).resolves.toBeUndefined();
      expect(entries).toHaveLength(0);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
