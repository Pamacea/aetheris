"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import JSZip from "jszip";
import {
  buildCampaignExport,
  campaignExportSchema,
  pluginIdSchema,
  type CampaignExport,
} from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type PluginToggleResult = { ok: true } | { ok: false; error: string };

/**
 * Active/désactive un module étendu (Phase 8) pour la campagne.
 * Réservé au MJ — le core (wiki, VTT, chat) n'est jamais concerné.
 */
export async function setCampaignPlugin(
  campaignId: string,
  pluginId: string,
  enabled: boolean,
): Promise<PluginToggleResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const parsed = pluginIdSchema.safeParse(pluginId);
  if (!parsed.success) return { ok: false, error: "Module inconnu." };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { enabledPlugins: true },
  });
  if (!campaign) return { ok: false, error: "Campagne introuvable." };

  const current = campaign.enabledPlugins;
  const has = current.includes(parsed.data);
  if (enabled === has) return { ok: true }; // rien à changer

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      enabledPlugins: {
        set: enabled ? [...current, parsed.data] : current.filter((p) => p !== parsed.data),
      },
    },
  });

  revalidatePath(`/campaign/${campaignId}`);
  return { ok: true };
}

// ── Phase 10 — Export / import de campagne (ZIP JSON) ───────────────

type CampaignArchiveResult =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string };

type CampaignImportResult = { ok: true; campaignId: string } | { ok: false; error: string };

function zipSlug(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return slug || "campagne";
}

/**
 * Sérialise lore (entities), modèles et scène de la campagne en
 * `campaign.json` zippé (base64 — le client décode et télécharge).
 */
export async function exportCampaign(campaignId: string): Promise<CampaignArchiveResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  // GM seul : l'archive contient les secrets MJ en clair (backup complet,
  // l'import recrée une campagne dont l'importeur est GM).
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      title: true,
      theme: true,
      gameSystem: true,
      enabledPlugins: true,
      entities: {
        select: {
          title: true,
          type: true,
          data: true,
          contentHtml: true,
          folder: true,
        },
        orderBy: { title: "asc" },
      },
      templates: {
        select: { name: true, category: true, schema: true },
        orderBy: { name: "asc" },
      },
      scene: { select: { state: true } },
    },
  });
  if (!campaign) return { ok: false, error: "Campagne introuvable." };

  let archive: CampaignExport;
  try {
    archive = buildCampaignExport({
      campaign: {
        title: campaign.title,
        theme: campaign.theme,
        gameSystem: campaign.gameSystem,
        enabledPlugins: campaign.enabledPlugins,
      },
      entities: campaign.entities,
      templates: campaign.templates,
      scene: campaign.scene,
    });
  } catch {
    return { ok: false, error: "Données incohérentes — export impossible." };
  }

  const zip = new JSZip();
  zip.file("campaign.json", JSON.stringify(archive, null, 2));
  const base64 = await zip.generateAsync({ type: "base64" });
  return { ok: true, filename: `${zipSlug(campaign.title)}.zip`, base64 };
}

/**
 * Importe une archive : validation Zod INTÉGRALE avant toute écriture,
 * puis création d'une nouvelle campagne en transaction (aucune écriture
 * partielle possible).
 */
export async function importCampaign(formData: FormData): Promise<CampaignImportResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Non authentifié." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fichier manquant." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Archive trop volumineuse (10 Mo max)." };
  }

  let json: unknown;
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry =
      zip.file("campaign.json") ??
      Object.values(zip.files).find((f) => !f.dir && f.name.endsWith(".json"));
    if (!entry) return { ok: false, error: "campaign.json introuvable." };
    json = JSON.parse(await entry.async("string"));
  } catch {
    return { ok: false, error: "Archive ZIP illisible." };
  }

  const parsed = campaignExportSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Archive invalide : ${parsed.error.issues[0]?.message ?? "format inconnu"}`,
    };
  }
  const archive = parsed.data;

  try {
    const campaignId = await prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          title: archive.campaign.title,
          theme: archive.campaign.theme,
          gameSystem: archive.campaign.gameSystem,
          enabledPlugins: [...new Set(archive.campaign.enabledPlugins)],
          members: { create: { userId: session.user.id, role: "GM" } },
        },
        select: { id: true },
      });
      if (archive.entities.length > 0) {
        await tx.entity.createMany({
          data: archive.entities.map((e) => ({
            title: e.title,
            type: e.type,
            data: e.data as object,
            contentHtml: e.contentHtml,
            folder: e.folder,
            campaignId: created.id,
          })),
        });
      }
      if (archive.templates.length > 0) {
        await tx.jsonTemplate.createMany({
          data: archive.templates.map((t) => ({
            name: t.name,
            category: t.category,
            schema: t.schema as object,
            campaignId: created.id,
          })),
        });
      }
      if (archive.scene) {
        await tx.vttScene.create({
          data: {
            campaignId: created.id,
            state: archive.scene.state as object,
          },
        });
      }
      return created.id;
    });

    revalidatePath("/dashboard");
    return { ok: true, campaignId };
  } catch {
    return { ok: false, error: "Échec de l'import — aucune donnée écrite." };
  }
}
