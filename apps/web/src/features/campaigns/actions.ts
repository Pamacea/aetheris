"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLUGIN_CATALOG } from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCreateCampaign } from "./validate";

/** État des formulaires (erreur affichée) — la réussite redirige côté serveur. */
export type CampaignFormState = { error: string } | null;

export async function createCampaign(formData: FormData): Promise<CampaignFormState> {
  const session = await getSession();
  if (!session) return { error: "Non authentifié." };

  const parsed = parseCreateCampaign(formData);
  if (!parsed.success) return { error: parsed.error };

  const campaign = await prisma.campaign.create({
    data: {
      ...parsed.data,
      // Tous les modules du catalogue activés d'office (désactivables ensuite
      // via Réglages) — sans ça, les pages plugin et `plugin:event` 404/refusent.
      enabledPlugins: ["lore-wiki", ...PLUGIN_CATALOG.map((p) => p.id)],
      members: { create: { userId: session.user.id, role: "GM" } },
    },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  redirect(`/campaign/${campaign.id}`);
}

/** Rejoint une campagne par son code d'invitation (membre PLAYER, idempotent). */
export async function joinCampaignByCode(formData: FormData): Promise<CampaignFormState> {
  const session = await getSession();
  if (!session) return { error: "Non authentifié." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Code d'invitation requis." };

  const campaign = await prisma.campaign.findUnique({
    where: { inviteCode: code },
    select: { id: true },
  });
  if (!campaign) return { error: "Code d'invitation inconnu." };

  await prisma.campaignMember.upsert({
    where: { userId_campaignId: { userId: session.user.id, campaignId: campaign.id } },
    create: { userId: session.user.id, campaignId: campaign.id, role: "PLAYER" },
    update: {},
  });

  revalidatePath("/dashboard");
  redirect(`/campaign/${campaign.id}`);
}
