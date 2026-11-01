"use server";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPresetGameSystem,
  PLUGIN_CATALOG,
  type SceneState,
  type SystemScene,
} from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeWikiHtml } from "@/lib/sanitize-wiki";
import {
  handoutSeedsFromDefaults,
  loreSeedsFromDefaults,
  templateSeedsFromDefaults,
  wikifyLoreLinks,
} from "@/features/game-systems/system-logic";
import { ensurePresetSystems } from "@/features/game-systems/systems";
import { parseCreateCampaign } from "./validate";

/** État des formulaires (erreur affichée) — la réussite redirige côté serveur. */
export type CampaignFormState = { error: string } | null;

export async function createCampaign(formData: FormData): Promise<CampaignFormState> {
  const session = await getSession();
  if (!session) return { error: "Non authentifié." };

  const parsed = parseCreateCampaign(formData);
  if (!parsed.success) return { error: parsed.error };

  // Système choisi dans le hub : preset officiel, homebrew de l'utilisateur
  // ou preset rendu public par un autre MJ.
  let system: {
    id: string;
    isPreset: boolean;
    defaultTemplates: unknown;
    defaultLore: unknown;
    defaultHandouts: unknown;
  } | null = null;
  if (parsed.data.gameSystemId) {
    await ensurePresetSystems();
    system = await prisma.gameSystem.findFirst({
      where: {
        id: parsed.data.gameSystemId,
        OR: [{ isPreset: true }, { ownerId: session.user.id }, { isPublic: true }],
      },
      select: {
        id: true,
        isPreset: true,
        defaultTemplates: true,
        defaultLore: true,
        defaultHandouts: true,
      },
    });
    if (!system) return { error: "Système de jeu introuvable ou non autorisé." };
  }

  const seeds = system ? templateSeedsFromDefaults(system.defaultTemplates) : null;
  if (seeds && !seeds.success) return { error: seeds.error };
  const lore = system ? loreSeedsFromDefaults(system.defaultLore) : null;
  if (lore && !lore.success) return { error: lore.error };
  const handouts = system ? handoutSeedsFromDefaults(system.defaultHandouts) : null;
  if (handouts && !handouts.success) return { error: handouts.error };

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
      // Livret de règles, lieux et PNJ du système, liés par `[[Titre]]`.
      ...(lore?.success && lore.seeds.length
        ? {
            entities: {
              create: lore.seeds.map((note) => ({
                title: note.title,
                type: "note",
                data: {},
                folder: note.folder ?? null,
                gmOnly: note.gmOnly ?? false,
                contentHtml: sanitizeWikiHtml(wikifyLoreLinks(note.contentHtml)),
              })),
            },
          }
        : {}),
      // Handouts de journal du système (accroche, briefing, lettre).
      ...(handouts?.success && handouts.seeds.length
        ? {
            journalEntries: {
              create: handouts.seeds.map((handout) => ({
                title: handout.title,
                content: handout.content,
                shared: handout.shared ?? false,
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

  // Prétirés et scène d'ouverture : le preset statique porte le contenu, la
  // base ne stocke que le seed. Les fiches exigent l'id du modèle créé.
  const preset = system?.isPreset ? getPresetGameSystem(system.id) : undefined;
  if (preset) {
    try {
      await seedPresetPregens(campaign.id, preset.pregens);
      if (preset.scene) await seedPresetScene(campaign.id, preset.scene);
    } catch {
      await prisma.campaign.delete({ where: { id: campaign.id } }).catch(() => undefined);
      return { error: "Initialisation de la campagne impossible. Réessayez." };
    }
  }

  revalidatePath("/dashboard");
  redirect(`/campaign/${campaign.id}`);
}

/** Fiches prétirées/PNJ rattachées au modèle du preset (par son nom). */
async function seedPresetPregens(
  campaignId: string,
  pregens: {
    title: string;
    template: string;
    folder?: string;
    data: Record<string, unknown>;
    content?: string;
  }[],
): Promise<void> {
  if (!pregens.length) return;
  const templates = await prisma.jsonTemplate.findMany({
    where: { campaignId },
    select: { id: true, name: true },
  });
  const byName = new Map(templates.map((template) => [template.name, template.id]));
  const rows = pregens.flatMap((pregen) => {
    const templateId = byName.get(pregen.template);
    return templateId
      ? [
          {
            title: pregen.title,
            type: templateId,
            data: pregen.data as Prisma.InputJsonValue,
            folder: pregen.folder ?? null,
            contentHtml: pregen.content ? sanitizeWikiHtml(wikifyLoreLinks(pregen.content)) : null,
          },
        ]
      : [];
  });
  if (rows.length) {
    await prisma.entity.createMany({ data: rows.map((row) => ({ ...row, campaignId })) });
  }
}

/** Scène d'ouverture : jetons du preset disposés en grille de 64 px. */
async function seedPresetScene(campaignId: string, scene: SystemScene): Promise<void> {
  const state: SceneState = {
    tokens: scene.tokens.map((token, index) => ({
      id: randomUUID(),
      x: 320 + (index % 4) * 96,
      y: 320 + Math.floor(index / 4) * 96,
      size: 64,
      rot: 0,
      name: token.name,
      color: token.color,
      hp: token.hp ?? null,
      hpMax: token.hpMax ?? null,
      ac: token.ac ?? null,
      noteId: null,
      ownerId: null,
      imageUrl: null,
      sight: { enabled: true, rangeCells: null, type: "normal" },
      light: { enabled: false, radiusCells: null },
      conditions: [],
    })),
    walls: [],
    grid: { type: "square", size: 64, offsetX: 0, offsetY: 0 },
    mapUrl: null,
    fog: { on: false, sightCells: 10 },
    theatreNotes: [],
  };
  await prisma.vttScene.upsert({
    where: { campaignId },
    create: { campaignId, state },
    update: { state },
  });
}

export type DeleteCampaignResult = { ok: true } | { ok: false; error: string };

/**
 * Suppression définitive d'une campagne (MJ uniquement) : contenu, membres et
 * scène partent en cascade. Aucun retour possible — la modale le rappelle.
 */
export async function deleteCampaign(campaignId: string): Promise<DeleteCampaignResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  const member = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { role: true },
  });
  if (member?.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/dashboard");
  return { ok: true };
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
