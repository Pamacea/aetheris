import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { DiceRoll } from "@aetheris/shared";
import { PrismaService } from "../database/prisma.service.js";
import { PluginRegistryService } from "../plugins/plugin-registry.service.js";

interface DiceRolledEvent {
  campaignId: string;
  payload: DiceRoll;
}

interface CampaignJoinedEvent {
  campaignId: string;
  userId: string;
}

interface SceneActivatedEvent {
  campaignId: string;
  userId: string;
  userName: string;
}

interface PluginEvent {
  campaignId: string;
  pluginId: string;
  type: string;
  fromName: string;
}

interface JournalDraft {
  title: string;
  content: string;
  shared: boolean;
}

/**
 * Écrit les événements de session dans le journal de campagne.
 * Un listener ne doit jamais faire échouer le gateway : les erreurs sont
 * loguées et absorbées ici.
 */
@Injectable()
export class JournalAutomationService {
  private readonly logger = new Logger(JournalAutomationService.name);

  /** shortcut: anti-flood en mémoire (1 entrée/campagne/s par instance) ;
   *  à déplacer dans un store partagé si le serveur est répliqué. */
  private readonly lastWriteAt = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly plugins: PluginRegistryService,
  ) {}

  @OnEvent("dice.rolled")
  async onDiceRolled(event: DiceRolledEvent): Promise<void> {
    const { campaignId, payload } = event;
    await this.record(campaignId, {
      title: `Jet — ${payload.rollerName}`,
      content: `${payload.expression} → ${payload.total} · dés : ${payload.results.join(", ")} · par ${payload.rollerName}`,
      shared: true,
    });
  }

  @OnEvent("campaign.joined")
  async onCampaignJoined(event: CampaignJoinedEvent): Promise<void> {
    const name = await this.resolveUserName(event.userId);
    await this.record(event.campaignId, {
      title: `Arrivée — ${name}`,
      content: "",
      shared: true,
    });
  }

  @OnEvent("scene.activated")
  async onSceneActivated(event: SceneActivatedEvent): Promise<void> {
    await this.record(event.campaignId, {
      title: "Scène activée",
      content: `par ${event.userName}`,
      shared: true,
    });
  }

  @OnEvent("plugin.event")
  async onPluginEvent(event: PluginEvent): Promise<void> {
    // Le payload brut n'est jamais persisté : PV/états du plugin restent
    // hors du journal, seul le fait de l'événement est noté.
    await this.record(event.campaignId, {
      title:
        event.pluginId === "combat"
          ? `Combat — ${event.type}`
          : `${event.pluginId} — ${event.type}`,
      content: `par ${event.fromName}`,
      shared: false,
    });
  }

  private async resolveUserName(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      return user?.name ?? "Un joueur";
    } catch {
      return "Un joueur";
    }
  }

  private async record(campaignId: string, draft: JournalDraft): Promise<void> {
    try {
      // Le module Journal peut être désactivé pour la campagne.
      if (!(await this.plugins.isEnabled(campaignId, "journal"))) return;

      const now = Date.now();
      const last = this.lastWriteAt.get(campaignId);
      if (last !== undefined && now - last < 1_000) return;
      this.lastWriteAt.set(campaignId, now);

      await this.prisma.journalEntry.create({
        data: {
          campaignId,
          title: draft.title.slice(0, 120),
          content: draft.content,
          shared: draft.shared,
        },
      });
    } catch (e) {
      this.logger.warn(
        `journal automatique ignoré (campagne ${campaignId}) : ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}
