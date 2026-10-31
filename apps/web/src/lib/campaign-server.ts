import type { PluginId } from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewModule } from "@/lib/grants";

export type CampaignRole = "GM" | "PLAYER";

interface CampaignMemberInfo {
  userId: string;
  role: CampaignRole;
  /** Grants granulaires persistés (Phase 10) — null = défaut. */
  permissions: unknown;
}

/** Vérifie l'adhésion à la campagne ; null si non membre ou non connecté. */
export async function requireCampaignMember(
  campaignId: string,
): Promise<CampaignMemberInfo | null> {
  const session = await getSession();
  if (!session) return null;
  const member = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { role: true, permissions: true },
  });
  if (!member) return null;
  return {
    userId: session.user.id,
    role: member.role as CampaignRole,
    permissions: member.permissions,
  };
}

/**
 * Adhésion + module activé ; null sinon (les pages de modules appellent
 * notFound()). Ajouter un module ne touche jamais au core : seule la
 * route elle-même appelle ce guard.
 */
export async function requireCampaignPlugin(
  campaignId: string,
  pluginId: PluginId,
): Promise<CampaignMemberInfo | null> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return null;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { enabledPlugins: true },
  });
  if (!campaign?.enabledPlugins.includes(pluginId)) return null;
  // Grant de refus persisté (Phase 10) : le joueur sans vue sur ce module → 404.
  if (!canViewModule(member.permissions, pluginId, member.role)) return null;
  return member;
}
