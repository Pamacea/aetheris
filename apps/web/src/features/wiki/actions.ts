"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  createWikiNoteSchema,
  sanitizeFieldData,
  saveWikiNoteSchema,
  templateSchemaSchema,
  updateWikiNoteSchema,
} from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { sanitizeWikiHtml } from "@/lib/sanitize-wiki";

export type WikiActionResult = { ok: true; id: string } | { ok: false; error: string };
export type WikiShareResult = { ok: true; slug: string | null } | { ok: false; error: string };

/** Intervalle minimum entre deux instantanés d'historique. */
const VERSION_INTERVAL_MS = 5 * 60 * 1000;
const VERSIONS_KEPT = 50;

/** Ids Prisma : `Entity.id @default(uuid())` (zod n'est pas une dépendance de web). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Ownership : l'id doit être un uuid ET appartenir à la campagne. */
async function ownedEntity(campaignId: string, entityId: string) {
  if (!UUID_RE.test(entityId)) return null;
  return prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true, contentHtml: true, shareSlug: true },
  });
}

export async function createWikiEntry(
  campaignId: string,
  input: { title: string; folder?: string; templateId?: string },
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = createWikiNoteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Titre invalide.");

  // Entrée basée sur un template : type = templateId, data = valeurs par défaut.
  let templateData: Record<string, unknown> | null = null;
  if (parsed.data.templateId) {
    const template = await prisma.jsonTemplate.findFirst({
      where: { id: parsed.data.templateId, campaignId },
      select: { schema: true },
    });
    if (!template) return invalid("Template introuvable.");
    const schema = templateSchemaSchema.safeParse(template.schema);
    if (!schema.success) return invalid("Schéma de template corrompu.");
    templateData = sanitizeFieldData(schema.data, {});
  }

  // Résolution de titre : une entrée au même titre (insensible à la casse)
  // est réutilisée pour éviter les doublons de liens [[...]].
  const existing = await prisma.entity.findFirst({
    where: { campaignId, title: { equals: parsed.data.title, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { ok: true, id: existing.id };

  const entry = await prisma.entity.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.templateId ?? "note",
      data: (templateData ?? {}) as object,
      folder: parsed.data.folder ?? null,
      contentHtml: "<p></p>",
      campaignId,
    },
    select: { id: true },
  });

  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true, id: entry.id };
}

export async function updateWikiEntry(
  campaignId: string,
  entityId: string,
  input: { title?: string; folder?: string | null },
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = updateWikiNoteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  if (parsed.data.title === undefined && parsed.data.folder === undefined) {
    return invalid("Rien à modifier.");
  }

  const owned = await ownedEntity(campaignId, entityId);
  if (!owned) return invalid("Entrée introuvable.");

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

export async function deleteWikiEntry(
  campaignId: string,
  entityId: string,
): Promise<WikiActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const owned = await ownedEntity(campaignId, entityId);
  if (!owned) return invalid("Entrée introuvable.");

  // Versions + arêtes du graphe : cascade côté Prisma.
  await prisma.entity.delete({ where: { id: entityId } });

  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true, id: entityId };
}

/**
 * Autosave : écrit le contenu et prend un instantané d'historique au plus
 * toutes les 5 minutes (les 50 dernières versions sont conservées).
 */
export async function saveWikiEntry(
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
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Contenu invalide.");

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true, contentHtml: true },
  });
  if (!entity) return invalid("Entrée introuvable.");

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
      await prisma.entityVersion.create({ data: { entityId, contentHtml: previous } });
      // Historique borné : on ne garde que les N dernières versions.
      const stale = await prisma.entityVersion.findMany({
        where: { entityId },
        orderBy: { createdAt: "desc" },
        skip: VERSIONS_KEPT,
        select: { id: true },
      });
      if (stale.length > 0) {
        await prisma.entityVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
      }
    }
    await prisma.entity.update({ where: { id: entityId }, data: { contentHtml: clean } });
  }

  return { ok: true, id: entityId };
}

/**
 * Partage public d'une entrée : `shared=true` génère (ou restitue) un
 * `shareSlug` aléatoire, `shared=false` le révoque (null).
 * shortcut: slug en base64url de 12 caractères, collision gérée à la main
 * (3 essais) — le slug n'a pas besoin d'être devinable, uniquement unique.
 */
export async function setWikiShare(
  campaignId: string,
  entityId: string,
  shared: boolean,
): Promise<WikiShareResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const owned = await ownedEntity(campaignId, entityId);
  if (!owned) return { ok: false, error: "Entrée introuvable." };

  if (!shared) {
    if (owned.shareSlug !== null) {
      await prisma.entity.update({ where: { id: entityId }, data: { shareSlug: null } });
      revalidatePath(`/campaign/${campaignId}/wiki`);
    }
    return { ok: true, slug: null };
  }

  if (owned.shareSlug) return { ok: true, slug: owned.shareSlug };

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = randomBytes(9).toString("base64url");
    try {
      await prisma.entity.update({ where: { id: entityId }, data: { shareSlug: slug } });
      revalidatePath(`/campaign/${campaignId}/wiki`);
      revalidatePath(`/shared/${slug}`);
      return { ok: true, slug };
    } catch (e) {
      // Violation d'unicité (P2002) → un autre slug ; sinon on remonte.
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  return { ok: false, error: "Génération du lien impossible (collision)." };
}

export async function listWikiVersions(
  campaignId: string,
  entityId: string,
): Promise<
  { ok: true; versions: { id: string; createdAt: string }[] } | { ok: false; error: string }
> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  if (!(await ownedEntity(campaignId, entityId)))
    return { ok: false, error: "Entrée introuvable." };

  const versions = await prisma.entityVersion.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  return {
    ok: true,
    versions: versions.map((v) => ({ id: v.id, createdAt: v.createdAt.toISOString() })),
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
  if (!member) return { ok: false, error: "Accès refusé." };
  // Écriture + réponse en HTML brut : réservé MJ (les versions d'avant le
  // sanitizer sont ré-sanitisées à la restauration).
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const version = await prisma.entityVersion.findFirst({
    where: { id: versionId, entityId, entity: { campaignId } },
    select: { id: true, contentHtml: true },
  });
  if (!version) return { ok: false, error: "Version introuvable." };

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { contentHtml: true },
  });
  if (!entity) return { ok: false, error: "Entrée introuvable." };

  const restored = sanitizeWikiHtml(version.contentHtml);

  // L'état courant devient une version : une restauration est annulable.
  await prisma.$transaction([
    prisma.entityVersion.create({
      data: { entityId, contentHtml: entity.contentHtml ?? "<p></p>" },
    }),
    prisma.entity.update({ where: { id: entityId }, data: { contentHtml: restored } }),
  ]);

  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true, id: entityId, contentHtml: restored };
}
