"use server";

import { requireCampaignMember, type CampaignRole } from "@/lib/campaign-server";
import { prisma } from "@/lib/prisma";
import { stripGmSecrets } from "@/lib/wiki";

export interface FichePayload {
  entityId: string;
  title: string;
  /** Schéma du template de la note (null = note libre sans fiche). */
  schemaRaw: unknown;
  data: Record<string, unknown>;
  /** Corps de la note — secrets MJ retirés pour un joueur (stripGmSecrets). */
  contentHtml: string;
  role: CampaignRole;
  notes: { id: string; title: string; folder: string | null; type: string }[];
  templates: { id: string; name: string; category: string | null; schema: unknown }[];
}

type FicheResult = { ok: true; fiche: FichePayload } | { ok: false; error: string };

/**
 * Charge la fiche (Entity + template) liée à un token pour le panneau VTT.
 * Même modèle de permissions que le wiki : tout membre accède, les données
 * sont de toute façon lisibles par les joueurs dans /wiki.
 */
export async function getWikiFiche(campaignId: string, entityId: string): Promise<FicheResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };

  const [entity, rawTemplates, entities] = await Promise.all([
    prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      select: { id: true, title: true, type: true, data: true, contentHtml: true },
    }),
    prisma.jsonTemplate.findMany({
      where: { campaignId },
      select: { id: true, name: true, category: true, schema: true },
      orderBy: { name: "asc" },
    }),
    prisma.entity.findMany({
      // block-lib (bibliothèque de blocs) exclue : jamais source ni « fiche ».
      where: { campaignId, type: { not: "block-lib" } },
      select: { id: true, title: true, folder: true, type: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!entity) return { ok: false, error: "Fiche introuvable." };

  const template =
    entity.type === "note" ? null : (rawTemplates.find((t) => t.id === entity.type) ?? null);

  // TemplateForm n'a pas besoin des blocs structurés : jamais envoyés
  // (pas de fuite gm via le panneau VTT).
  const data: Record<string, unknown> =
    entity.type === "note" ? {} : { ...((entity.data as Record<string, unknown>) ?? {}) };
  delete data.blocks;

  return {
    ok: true,
    fiche: {
      entityId: entity.id,
      title: entity.title,
      schemaRaw: template ? template.schema : null,
      data,
      contentHtml:
        member.role === "GM" ? (entity.contentHtml ?? "") : stripGmSecrets(entity.contentHtml),
      role: member.role,
      notes: entities.map((e) => ({
        id: e.id,
        title: e.title,
        folder: e.folder,
        type: e.type,
      })),
      templates: rawTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        schema: t.schema,
      })),
    },
  };
}
