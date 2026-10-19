import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../database/prisma.service.js";
import type { AuthenticatedRequest } from "../auth/session.guard.js";
import { PluginRegistryService } from "./plugin-registry.service.js";

export const REQUIRE_PLUGIN_KEY = "aetheris:requires_plugin";

/** Marque un handler HTTP comme dépendant d'un plugin activable par campagne. */
export const RequiresPlugin = (pluginId: string) => SetMetadata(REQUIRE_PLUGIN_KEY, pluginId);

/**
 * Guard HTTP : vérifie que le plugin demandé est enregistré, que
 * l'utilisateur est membre de la campagne et que le plugin est activé
 * dans `Campaign.enabledPlugins`.
 */
@Injectable()
export class PluginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: PluginRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const pluginId = this.reflector.get<string>(REQUIRE_PLUGIN_KEY, handler);
    if (!pluginId) return true;

    const req = context.switchToHttp().getRequest<
      AuthenticatedRequest & {
        params: Record<string, string | undefined>;
        query: Record<string, unknown>;
        body: Record<string, unknown>;
      }
    >();

    const campaignId =
      req.params.campaignId ??
      (typeof req.query.campaignId === "string" ? req.query.campaignId : undefined) ??
      (typeof req.body?.campaignId === "string" ? req.body.campaignId : undefined);
    if (!campaignId) throw new BadRequestException("campaignId manquant");

    if (!req.user) throw new UnauthorizedException();
    if (!this.registry.get(pluginId)) {
      throw new ForbiddenException(`Plugin inconnu : ${pluginId}`);
    }

    const member = await this.prisma.campaignMember.findUnique({
      where: {
        userId_campaignId: { userId: req.user.id, campaignId },
      },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException("Non membre de la campagne");

    if (!(await this.registry.isEnabled(campaignId, pluginId))) {
      throw new ForbiddenException(`Plugin « ${pluginId} » désactivé pour cette campagne`);
    }

    return true;
  }
}
