import { Module } from "@nestjs/common";
import { PingService } from "./ping.service.js";
import { PLUGIN_HOOK_HANDLER } from "../../core/plugins/register-plugin.decorator.js";

/**
 * Module du plugin ping — jamais importé statiquement par le core,
 * chargé à la demande via PluginRegistryService.loadService().
 */
@Module({
  providers: [PingService, { provide: PLUGIN_HOOK_HANDLER, useExisting: PingService }],
  exports: [PingService],
})
export class PingModule {}
