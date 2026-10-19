import { Injectable, Logger } from "@nestjs/common";
import {
  RegisterPlugin,
  type PluginHookHandler,
} from "../../core/plugins/register-plugin.decorator.js";

/**
 * Plugin vide de démonstration (Phase 2) : prouve qu'un plugin peut être
 * activé/désactivé par campagne via `Campaign.enabledPlugins`.
 * Son module n'est chargé (LazyModuleLoader) qu'au premier appel.
 * Hooks : écoute `chat:message` pour prouver l'exécution des hooks core.
 */
@Injectable()
@RegisterPlugin(
  {
    id: "ping",
    name: "Ping",
    description: "Plugin de démonstration — vérifie le chargement lazy par campagne",
    hooks: ["chat:message"],
  },
  () => import("./ping.module.js").then((m) => m.PingModule),
)
export class PingService implements PluginHookHandler {
  private readonly logger = new Logger(PingService.name);

  pong(campaignId: string): { pong: true; campaignId: string; at: string } {
    return { pong: true, campaignId, at: new Date().toISOString() };
  }

  onHook(event: string, data: { campaignId: string; payload: unknown }): void {
    this.logger.log(`Hook ${event} reçu (campagne ${data.campaignId})`);
  }
}
