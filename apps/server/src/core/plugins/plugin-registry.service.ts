import { Injectable, Logger, Type } from "@nestjs/common";
import { LazyModuleLoader } from "@nestjs/core";
import { PrismaService } from "../database/prisma.service.js";
import {
  getPluginRegistrations,
  PLUGIN_HOOK_HANDLER,
  type PluginHookHandler,
  type PluginManifest,
} from "./register-plugin.decorator.js";

@Injectable()
export class PluginRegistryService {
  private readonly logger = new Logger(PluginRegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lazyModuleLoader: LazyModuleLoader,
  ) {}

  list(): PluginManifest[] {
    return [...getPluginRegistrations().values()].map((r) => r.manifest);
  }

  get(pluginId: string): PluginManifest | undefined {
    return getPluginRegistrations().get(pluginId)?.manifest;
  }

  /** Le plugin est-il activé dans `Campaign.enabledPlugins` ? */
  async isEnabled(campaignId: string, pluginId: string): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { enabledPlugins: true },
    });
    return campaign?.enabledPlugins.includes(pluginId) ?? false;
  }

  /**
   * Charge le module du plugin via LazyModuleLoader (une seule fois) et
   * en retourne un provider. Le module du plugin n'est jamais importé
   * statiquement par le core.
   */
  async loadService<T>(pluginId: string, token: Type<T>): Promise<T> {
    const registration = getPluginRegistrations().get(pluginId);
    if (!registration?.loader) {
      throw new Error(`Plugin sans module chargeable : ${pluginId}`);
    }
    const moduleRef = await this.lazyModuleLoader.load(registration.loader);
    return moduleRef.get(token, { strict: false });
  }

  /**
   * Dispatch d'un hook core (`objet:action`) vers les plugins qui le
   * déclarent au manifeste ET sont activés pour la campagne. Le handler
   * est le provider `PLUGIN_HOOK_HANDLER` du module (chargé lazy) ;
   * une erreur de plugin est loggée, jamais propagée au core.
   */
  async dispatchHook(hook: string, campaignId: string, payload: unknown): Promise<void> {
    for (const [pluginId, reg] of getPluginRegistrations()) {
      if (!reg.manifest.hooks?.includes(hook) || !reg.loader) continue;
      try {
        if (!(await this.isEnabled(campaignId, pluginId))) continue;
        const moduleRef = await this.lazyModuleLoader.load(reg.loader);
        const handler = moduleRef.get<PluginHookHandler>(PLUGIN_HOOK_HANDLER, {
          strict: false,
        });
        await handler.onHook(hook, { campaignId, payload });
      } catch (e) {
        this.logger.warn(`Hook ${hook} échoué (plugin ${pluginId}) : ${String(e)}`);
      }
    }
  }
}
