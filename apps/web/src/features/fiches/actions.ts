"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type EntityAssigneesResult = { ok: true } | { ok: false; error: string };

/** Remplace les joueurs assignés à une fiche — MJ uniquement. */
export async function setEntityAssignees(
  campaignId: string,
  entityId: string,
  userIds: string[],
): Promise<EntityAssigneesResult> {
  if (!Array.isArray(userIds) || userIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "Entrée invalide." };
  }

  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true },
  });
  if (!entity) return { ok: false, error: "Fiche introuvable." };

  // Seuls les membres de la campagne sont retenus (les autres ids sont ignorés).
  const members = await prisma.campaignMember.findMany({
    where: { campaignId, userId: { in: [...new Set(userIds)] } },
    select: { userId: true },
  });
  const kept = members.map((m) => m.userId);

  await prisma.entity.update({
    where: { id: entityId },
    data: { assignees: { deleteMany: {}, create: kept.map((userId) => ({ userId })) } },
  });
  revalidatePath(`/campaign/${campaignId}/fiches`);
  return { ok: true };
}
