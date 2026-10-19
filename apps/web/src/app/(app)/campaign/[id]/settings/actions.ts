"use server";

import { revalidatePath } from "next/cache";
import { sanitizeCss, saveCampaignThemeSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type ThemeActionResult = { ok: true } | { ok: false; error: string };

/**
 * Sauvegarde le CSS / JS custom de la campagne (Phase 9).
 * Réservé au MJ ; le CSS est sanitisé avant écriture (le JS, lui,
 * ne s'exécute jamais dans le DOM parent — iframe sandboxé uniquement).
 */
export async function saveCampaignTheme(
  campaignId: string,
  input: unknown,
): Promise<ThemeActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const parsed = saveCampaignThemeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Entrée invalide.",
    };
  }

  const clean = sanitizeCss(parsed.data.css);
  if (!clean.ok) return { ok: false, error: clean.error };

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      customStyles: clean.css || null,
      customScript: parsed.data.js || null,
    },
  });

  revalidatePath(`/campaign/${campaignId}`);
  return { ok: true };
}

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
