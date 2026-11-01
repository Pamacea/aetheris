"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  buildCharacteristicTemplate,
  createCustomGameSystemSchema,
  sanitizeCss,
  systemHandoutListSchema,
  systemLoreNoteListSchema,
  systemTemplateSeedListSchema,
  systemTemplateSeedSchema,
  type SystemAsset,
  type SystemGenre,
  type SystemTemplateSeed,
} from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { requireCampaignMember } from "@/lib/campaign-server";
import { prisma } from "@/lib/prisma";
import {
  assetsForImportedSystem,
  parseSystemImport,
  templatesForImportedSystem,
} from "./system-logic";
import type { GameSystemOption } from "./systems";

export type GameSystemActionResult =
  | { ok: true; system: GameSystemOption }
  | { ok: false; error: string };

interface SystemWrite {
  name: string;
  description?: string | undefined;
  genre: SystemGenre;
  templates: SystemTemplateSeed[];
  assets: SystemAsset[];
}

/** Écriture d'un système homebrew, toujours rattaché à l'utilisateur connecté. */
async function persistSystem(userId: string, input: SystemWrite): Promise<GameSystemOption> {
  const system = await prisma.gameSystem.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      genre: input.genre,
      isPreset: false,
      ownerId: userId,
      defaultTemplates: input.templates as unknown as Prisma.InputJsonValue,
      defaultAssets: input.assets as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, description: true, genre: true, isPreset: true },
  });
  revalidatePath("/dashboard");
  return system;
}

function firstIssue(error: { issues: { message: string }[] }, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

/** Homebrew System Builder : caractéristiques → modèle « Personnage ». */
export async function createCustomGameSystem(input: unknown): Promise<GameSystemActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  const parsed = createCustomGameSystemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error, "Système invalide.") };
  }

  const system = await persistSystem(session.user.id, {
    name: parsed.data.name,
    description: parsed.data.description,
    genre: parsed.data.genre,
    templates: [buildCharacteristicTemplate(parsed.data.characteristics)],
    assets: [],
  });
  return { ok: true, system };
}

export type SaveTemplatePresetResult =
  | { ok: true; systemId: string; replaced: boolean }
  | { ok: false; error: string };

/**
 * Enregistre un modèle de la campagne comme preset réutilisable du système
 * homebrew de l'utilisateur (MJ seulement, système possédé, jamais un preset).
 */
export async function saveTemplateAsSystemPreset(
  campaignId: string,
  templateId: string,
  input: { systemId: string; name?: string },
): Promise<SaveTemplatePresetResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member || member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const template = await prisma.jsonTemplate.findFirst({
    where: { id: templateId, campaignId },
    select: { name: true, category: true, schema: true, customCss: true },
  });
  if (!template) return { ok: false, error: "Modèle introuvable." };

  const system = await prisma.gameSystem.findFirst({
    where: { id: input.systemId, ownerId: member.userId, isPreset: false },
    select: { id: true, defaultTemplates: true },
  });
  if (!system) return { ok: false, error: "Système introuvable." };

  // Style : même traitement que l'écriture d'un modèle (jamais seulement client).
  let customCss: string | undefined;
  if (template.customCss?.trim()) {
    const css = sanitizeCss(template.customCss);
    if (!css.ok) return { ok: false, error: css.error };
    customCss = css.css;
  }

  const seed = systemTemplateSeedSchema.safeParse({
    name: input.name?.trim() || template.name,
    ...(template.category ? { category: template.category } : {}),
    ...(customCss ? { customCss } : {}),
    schema: template.schema,
  });
  if (!seed.success) return { ok: false, error: firstIssue(seed.error, "Modèle invalide.") };

  // Relecture tolérante : une entrée corrompue ne bloque pas l'enregistrement.
  const current = Array.isArray(system.defaultTemplates) ? system.defaultTemplates : [];
  const seeds: SystemTemplateSeed[] = [];
  for (const entry of current) {
    const parsed = systemTemplateSeedSchema.safeParse(entry);
    if (parsed.success) seeds.push(parsed.data);
  }

  const wanted = seed.data.name.toLowerCase();
  const at = seeds.findIndex((s) => s.name.toLowerCase() === wanted);
  const replaced = at >= 0;
  if (replaced) {
    seeds[at] = seed.data;
  } else {
    if (seeds.length >= 50) return { ok: false, error: "50 presets maximum par système." };
    seeds.push(seed.data);
  }

  await prisma.gameSystem.update({
    where: { id: system.id },
    data: { defaultTemplates: seeds as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/campaign/${campaignId}/wiki/templates`);
  return { ok: true, systemId: system.id, replaced };
}

export type SaveCampaignPresetResult =
  | { ok: true; systemId: string }
  | { ok: false; error: string };

/**
 * Capture la structure d'une campagne (modèles, notes wiki, handouts) dans un
 * système homebrew personnel, réutilisable à la création d'autres campagnes.
 * MJ uniquement : le contenu capturé peut inclure des notes secrètes.
 */
export async function saveCampaignAsPreset(
  campaignId: string,
  input: { name: string; description?: string; isPublic?: boolean },
): Promise<SaveCampaignPresetResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member || member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nom du preset requis." };
  if (name.length > 120) return { ok: false, error: "120 caractères maximum." };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      gameSystemRef: { select: { genre: true } },
      templates: {
        orderBy: { name: "asc" },
        select: { name: true, category: true, schema: true, customCss: true },
      },
      entities: {
        where: { type: "note" },
        orderBy: { title: "asc" },
        select: { title: true, contentHtml: true, folder: true, gmOnly: true },
      },
      journalEntries: {
        orderBy: { title: "asc" },
        select: { title: true, content: true, shared: true },
      },
    },
  });
  if (!campaign) return { ok: false, error: "Campagne introuvable." };

  const templates = systemTemplateSeedListSchema.safeParse(
    campaign.templates.map((template) => ({
      name: template.name,
      ...(template.category ? { category: template.category } : {}),
      ...(template.customCss ? { customCss: template.customCss } : {}),
      schema: template.schema,
    })),
  );
  if (!templates.success) {
    return { ok: false, error: firstIssue(templates.error, "Modèles de la campagne invalides.") };
  }
  const lore = systemLoreNoteListSchema.safeParse(
    campaign.entities.map((entity) => ({
      title: entity.title,
      contentHtml: entity.contentHtml ?? "",
      ...(entity.folder ? { folder: entity.folder } : {}),
      ...(entity.gmOnly ? { gmOnly: true } : {}),
    })),
  );
  if (!lore.success) {
    return { ok: false, error: firstIssue(lore.error, "Notes de wiki de la campagne invalides.") };
  }
  const handouts = systemHandoutListSchema.safeParse(
    campaign.journalEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      ...(entry.shared ? { shared: true } : {}),
    })),
  );
  if (!handouts.success) {
    return { ok: false, error: firstIssue(handouts.error, "Handouts de la campagne invalides.") };
  }

  const isPublic = input.isPublic ?? false;
  const system = await prisma.gameSystem.create({
    data: {
      name,
      description: input.description?.trim() || null,
      genre: campaign.gameSystemRef?.genre ?? "autre",
      isPreset: false,
      ownerId: member.userId,
      isPublic,
      publishedAt: isPublic ? new Date() : null,
      defaultTemplates: templates.data as unknown as Prisma.InputJsonValue,
      defaultLore: lore.data as unknown as Prisma.InputJsonValue,
      defaultHandouts: handouts.data as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/campaign/${campaignId}/settings`);
  return { ok: true, systemId: system.id };
}

export type SetSystemPublicResult = { ok: true } | { ok: false; error: string };

/** Bascule la visibilité d'un preset personnel — jamais un preset officiel. */
export async function setSystemPublic(
  systemId: string,
  isPublic: boolean,
): Promise<SetSystemPublicResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  const updated = await prisma.gameSystem.updateMany({
    where: { id: systemId, ownerId: session.user.id, isPreset: false },
    data: { isPublic, publishedAt: isPublic ? new Date() : null },
  });
  if (updated.count === 0) return { ok: false, error: "Système introuvable." };

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Import JSON strict : valide tout avant la moindre écriture. */
export async function importCustomGameSystem(input: unknown): Promise<GameSystemActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  const parsed = parseSystemImport(input);
  if (!parsed.success) return { ok: false, error: parsed.error };

  const system = await persistSystem(session.user.id, {
    name: parsed.data.name,
    description: parsed.data.description,
    genre: parsed.data.genre,
    templates: templatesForImportedSystem(parsed.data),
    assets: assetsForImportedSystem(parsed.data),
  });
  return { ok: true, system };
}
