"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLUGIN_CATALOG } from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { templateSeedsFromDefaults } from "@/features/game-systems/system-logic";
import { ensurePresetSystems } from "@/features/game-systems/systems";
import { parseCreateCampaign } from "./validate";

/** État des formulaires (erreur affichée) — la réussite redirige côté serveur. */
export type CampaignFormState = { error: string } | null;

export async function createCampaign(formData: FormData): Promise<CampaignFormState> {
  const session = await getSession();
  if (!session) return { error: "Non authentifié." };

  const parsed = parseCreateCampaign(formData);
  if (!parsed.success) return { error: parsed.error };

  // Système choisi dans le hub : preset officiel ou homebrew de l'utilisateur.
  let system: { id: string; isPreset: boolean; defaultTemplates: unknown } | null = null;
  if (parsed.data.gameSystemId) {
    await ensurePresetSystems();
    system = await prisma.gameSystem.findFirst({
      where: {
        id: parsed.data.gameSystemId,
        OR: [{ isPreset: true }, { ownerId: session.user.id }],
      },
      select: { id: true, isPreset: true, defaultTemplates: true },
    });
    if (!system) return { error: "Système de jeu introuvable ou non autorisé." };
  }

  const seeds = system ? templateSeedsFromDefaults(system.defaultTemplates) : null;
  if (seeds && !seeds.success) return { error: seeds.error };

  const campaign = await prisma.campaign.create({
    data: {
      title: parsed.data.title,
      theme: parsed.data.theme,
      description: parsed.data.description ?? null,
      visibility: parsed.data.visibility,
      coverImage: parsed.data.coverImage,
      logo: parsed.data.logo,
      gameSystem: system ? (system.isPreset ? system.id : "custom") : parsed.data.gameSystem,
      gameSystemId: system?.id ?? null,
      // Modèles du système seedés dans le wiki de la campagne.
      ...(seeds?.success && seeds.seeds.length
        ? {
            templates: {
              create: seeds.seeds.map((seed) => ({
                name: seed.name,
                category: seed.category ?? null,
                schema: seed.schema,
                customCss: seed.customCss ?? null,
              })),
            },
          }
        : {}),
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
