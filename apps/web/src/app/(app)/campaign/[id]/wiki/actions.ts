"use server";

import { revalidatePath } from "next/cache";
import {
  createWikiNoteSchema,
  noteBlocksSchema,
  sanitizeFieldData,
  saveWikiNoteSchema,
  templateSchemaSchema,
  updateWikiNoteSchema,
  type TemplateSchema,
} from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { sanitizeWikiHtml } from "@/lib/sanitize-wiki";

type WikiActionResult = { ok: true; id: string } | { ok: false; error: string };

/** Intervalle minimum entre deux instantanés d'historique. */
const VERSION_INTERVAL_MS = 5 * 60 * 1000;
const VERSIONS_KEPT = 50;

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export async function createWikiNote(
  campaignId: string,
  input: { title: string; folder?: string; templateId?: string },
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = createWikiNoteSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Titre invalide.");
  }

  // Note basée sur un template : type = templateId, data = valeurs par défaut.
  let templateSchema: TemplateSchema | null = null;
  if (parsed.data.templateId) {
    const template = await prisma.jsonTemplate.findFirst({
      where: { id: parsed.data.templateId, campaignId },
      select: { schema: true },
    });
    if (!template) return invalid("Template introuvable.");
    const schema = templateSchemaSchema.safeParse(template.schema);
    if (!schema.success) return invalid("Schéma de template corrompu.");
    templateSchema = schema.data;
  }

  // Résolution de titre : une note au même titre (insensible à la casse)
  // est réutilisée pour éviter les doublons de liens [[...]].
  const existing = await prisma.entity.findFirst({
    where: {
      campaignId,
      title: { equals: parsed.data.title, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) return { ok: true, id: existing.id };

  const note = await prisma.entity.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.templateId ?? "note",
      data: templateSchema ? (sanitizeFieldData(templateSchema, {}) as object) : {},
      folder: parsed.data.folder ?? null,
      contentHtml: "<p></p>",
      campaignId,
    },
    select: { id: true },
  });

  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true, id: note.id };
}

export async function updateWikiNote(
  campaignId: string,
  entityId: string,
  input: { title?: string; folder?: string | null },
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = updateWikiNoteSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }
  if (parsed.data.title === undefined && parsed.data.folder === undefined) {
    return invalid("Rien à modifier.");
  }

  const owned = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Note introuvable.");

  await prisma.entity.update({
    where: { id: entityId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.folder !== undefined ? { folder: parsed.data.folder } : {}),
    },
  });

  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true, id: entityId };
}

/**
 * Autosave : écrit le contenu et prend un instantané d'historique au plus
 * toutes les 5 minutes (les 50 dernières versions sont conservées).
 */
export async function saveWikiNote(
  campaignId: string,
  entityId: string,
  contentHtml: string,
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  // MJ seul : le joueur reçoit un HTML strippé de ses gm-secrets, son
  // autosave réécrirait donc la note en détruisant les secrets MJ.
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = saveWikiNoteSchema.safeParse({ contentHtml });
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Contenu invalide.");
  }

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true, contentHtml: true },
  });
  if (!entity) return invalid("Note introuvable.");

  // Sanitize avant comparaison : évite un snapshot + rewrite à chaque
  // autosave si le brut du client diffère toujours du propre en base.
  const clean = sanitizeWikiHtml(parsed.data.contentHtml);
  const previous = entity.contentHtml === clean ? null : entity.contentHtml;
  if (previous !== null) {
    const last = await prisma.entityVersion.findFirst({
      where: { entityId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!last || Date.now() - last.createdAt.getTime() > VERSION_INTERVAL_MS) {
      await prisma.entityVersion.create({
        data: { entityId, contentHtml: previous },
      });
      // Historique borné : on ne garde que les N dernières versions.
      const stale = await prisma.entityVersion.findMany({
        where: { entityId },
        orderBy: { createdAt: "desc" },
        skip: VERSIONS_KEPT,
        select: { id: true },
      });
      if (stale.length > 0) {
        await prisma.entityVersion.deleteMany({
          where: { id: { in: stale.map((v) => v.id) } },
        });
      }
    }
    await prisma.entity.update({
      where: { id: entityId },
      data: { contentHtml: clean },
    });
  }

  return { ok: true, id: entityId };
}

/**
 * Sauvegarde des blocs structurés dans `Entity.data.blocks` — notes libres
 * ET fiches (`data.blocks` cohabite avec les valeurs de champs, que
 * `sanitizeFieldData` préserve à l'autosave).
 *
 * Écriture MJ seule : un joueur ne peut donc jamais écraser les blocs `gm`
 * (leur lecture est filtrée côté page, en miroir de `stripGmSecrets()`).
 * shortcut: EntityVersion ne versionne que `contentHtml`, donc les blocs
 * structurés ne sont pas restaurés par l'historique.
 */
export async function saveNoteBlocks(
  campaignId: string,
  entityId: string,
  blocks: unknown,
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = noteBlocksSchema.safeParse(blocks);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Blocs invalides.");
  }

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true, type: true, data: true },
  });
  if (!entity) return invalid("Note introuvable.");

  await prisma.entity.update({
    where: { id: entityId },
    data: {
      data: {
        ...(entity.data as Record<string, unknown>),
        blocks: parsed.data,
      } as object,
    },
  });

  return { ok: true, id: entityId };
}

/**
 * Sauvegarde de la Bibliothèque de blocs (Entity `block-lib` unique par
 * campagne) — mêmes garanties que `saveNoteBlocks` : GM seul, schéma validé.
 * Les joueurs ne la lisent qu'en filtrant `b.gm` côté page.
 */
export async function saveBlockLibrary(
  campaignId: string,
  blocks: unknown,
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = noteBlocksSchema.safeParse(blocks);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Blocs invalides.");
  }

  const existing = await prisma.entity.findFirst({
    where: { campaignId, type: "block-lib" },
    select: { id: true },
  });
  if (existing) {
    await prisma.entity.update({
      where: { id: existing.id },
      data: { data: { blocks: parsed.data } as object },
    });
    return { ok: true, id: existing.id };
  }

  const created = await prisma.entity.create({
    data: {
      title: "Bibliothèque de blocs",
      type: "block-lib",
      data: { blocks: parsed.data },
      contentHtml: "<p></p>",
      campaignId,
    },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

export async function listWikiVersions(
  campaignId: string,
  entityId: string,
): Promise<
  { ok: true; versions: { id: string; createdAt: string }[] } | { ok: false; error: string }
> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };

  const owned = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Note introuvable." };

  const versions = await prisma.entityVersion.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  return {
    ok: true,
    versions: versions.map((v) => ({
      id: v.id,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

type RestoreWikiResult =
  | { ok: true; id: string; contentHtml: string }
  | { ok: false; error: string };

export async function restoreWikiVersion(
  campaignId: string,
  entityId: string,
  versionId: string,
): Promise<RestoreWikiResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  // Écriture + réponse en HTML brut : réservé MJ (les versions d'avant le
  // sanitizer sont ré-sanitisées à la restauration).
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const version = await prisma.entityVersion.findFirst({
    where: { id: versionId, entityId, entity: { campaignId } },
    select: { id: true, contentHtml: true },
  });
  if (!version) return invalid("Version introuvable.");

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { contentHtml: true },
  });
  if (!entity) return invalid("Note introuvable.");

  const restored = sanitizeWikiHtml(version.contentHtml);

  // L'état courant devient une version : une restauration est annulable.
  await prisma.$transaction([
    prisma.entityVersion.create({
      data: { entityId, contentHtml: entity.contentHtml ?? "<p></p>" },
    }),
    prisma.entity.update({
      where: { id: entityId },
      data: { contentHtml: restored },
    }),
  ]);

  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true, id: entityId, contentHtml: restored };
}
