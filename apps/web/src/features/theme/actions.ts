"use server";

import { sanitizeCss } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

/**
 * Lit le thème custom pour l'injecteur côté client (tous les membres,
 * lecture seule). Double sanitisée à la lecture : défense en profondeur
 * si une ligne existante en base venait d'un ancien format.
 */
export async function getCampaignTheme(campaignId: string): Promise<{ css: string }> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { css: "" };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { customStyles: true },
  });
  if (!campaign?.customStyles) return { css: "" };

  const clean = sanitizeCss(campaign.customStyles);
  return { css: clean.ok ? clean.css : "" };
}
