import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./core/database/prisma.module.js";
import { SessionGuard } from "./core/auth/session.guard.js";
import { PluginGuard } from "./core/plugins/plugin.guard.js";
import { PluginRegistryService } from "./core/plugins/plugin-registry.service.js";
import { JournalAutomationService } from "./core/journal/journal-automation.service.js";
import { CampaignGateway } from "./core/websocket/campaign.gateway.js";
import { PluginsController } from "./plugins/plugins.controller.js";

@Module({
  imports: [
    // Racine du monorepo : un seul .env pour web + server (Neon, OAuth…)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    EventEmitterModule.forRoot(),
    // 100 requêtes / 60 s et par IP (ttl en ms depuis throttler v6).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AppController, PluginsController],
  providers: [
    AppService,
    SessionGuard,
    PluginGuard,
    PluginRegistryService,
    JournalAutomationService,
    CampaignGateway,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
