import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../core/auth/session.guard.js";
import { PluginGuard, RequiresPlugin } from "../core/plugins/plugin.guard.js";
import { PluginRegistryService } from "../core/plugins/plugin-registry.service.js";
import { PingService } from "./ping/ping.service.js";

/**
 * Routes HTTP des plugins. Le core enregistre les routes ; l'activation
 * par campagne est tranchée par PluginGuard (`Campaign.enabledPlugins`).
 */
@Controller("plugins/:campaignId")
@UseGuards(SessionGuard, PluginGuard)
export class PluginsController {
  constructor(private readonly registry: PluginRegistryService) {}

  @Get("ping")
  @RequiresPlugin("ping")
  async ping(@Param("campaignId") campaignId: string) {
    const ping = await this.registry.loadService("ping", PingService);
    return ping.pong(campaignId);
  }
}
