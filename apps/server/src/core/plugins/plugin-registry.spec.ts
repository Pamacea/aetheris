import type { LazyModuleLoader } from "@nestjs/core";
import { PluginRegistryService } from "./plugin-registry.service.js";
import { RegisterPlugin, type PluginHookHandler } from "./register-plugin.decorator.js";
import type { PrismaService } from "../database/prisma.service.js";

/**
 * Phase 10 — exécution des hooks plugins : le core dispatch un hook
 * uniquement vers les plugins qui le déclarent au manifeste ET sont
 * activés pour la campagne ; une erreur de handler n'est jamais propagée.
 */

// Registre local de spec (ids uniques — la map du décorateur est globale).
class HookedPlugin {}
RegisterPlugin(
  { id: "spec-hooked", name: "Spec hooked", hooks: ["chat:message"] },
  () => class {},
)(HookedPlugin);

class UnhookedPlugin {}
RegisterPlugin({ id: "spec-unhooked", name: "Spec unhooked" }, () => class {})(UnhookedPlugin);

type HookCall = { event: string; data: { campaignId: string; payload: unknown } };

function setup(enabledPlugins: string[], onHook?: PluginHookHandler["onHook"]) {
  const calls: HookCall[] = [];
  const handler: PluginHookHandler = {
    onHook: async (event, data) => {
      calls.push({ event, data });
      await onHook?.(event, data);
    },
  };
  const prisma = {
    campaign: { findUnique: async () => ({ enabledPlugins }) },
  } as unknown as PrismaService;
  const loader = {
    load: async () => ({ get: () => handler }),
  } as unknown as LazyModuleLoader;
  const registry = new PluginRegistryService(prisma, loader);
  return { registry, calls };
}

describe("PluginRegistryService.dispatchHook", () => {
  const campaignId = "11111111-1111-4111-8111-111111111111";

  it("appelle le handler du plugin activé déclarant le hook", async () => {
    const { registry, calls } = setup(["spec-hooked"]);
    await registry.dispatchHook("chat:message", campaignId, { hello: "world" });
    expect(calls).toEqual([
      {
        event: "chat:message",
        data: { campaignId, payload: { hello: "world" } },
      },
    ]);
  });

  it("ignore les plugins désactivés pour la campagne", async () => {
    const { registry, calls } = setup([]);
    await registry.dispatchHook("chat:message", campaignId, {});
    expect(calls).toHaveLength(0);
  });

  it("ignore les hooks non déclarés au manifeste", async () => {
    const { registry, calls } = setup(["spec-hooked", "spec-unhooked"]);
    await registry.dispatchHook("other:event", campaignId, {});
    expect(calls).toHaveLength(0);
  });

  it("une erreur de handler n'interrompt pas le dispatch", async () => {
    const { registry, calls } = setup(["spec-hooked"], () => {
      throw new Error("boom");
    });
    await expect(registry.dispatchHook("chat:message", campaignId, {})).resolves.toBeUndefined();
    expect(calls).toHaveLength(1);
  });
});
