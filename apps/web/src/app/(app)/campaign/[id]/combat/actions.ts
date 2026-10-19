"use server";

import { combatStateSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type CombatActionResult = { ok: true } | { ok: false; error: string };

/**
 * Persiste l'état du combat (commit du MJ). Le broadcast aux autres
 * clients passe par le relais WS générique `plugin:event` — ce module
 * ne touche pas au gateway.
 */
export async function saveCombatState(
  campaignId: string,
  state: unknown,
): Promise<CombatActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const parsed = combatStateSchema.safeParse(state);
  if (!parsed.success) return { ok: false, error: "État de combat invalide." };

  await prisma.campaignEncounter.upsert({
    where: { campaignId },
    create: { campaignId, state: parsed.data as object },
    update: { state: parsed.data as object },
  });
  return { ok: true };
}
