"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

export type LinkActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  campaignId: z.string().min(1),
  fromEntityId: z.string().min(1),
  toEntityId: z.string().min(1),
  label: z.string().trim().max(80),
});

const deleteSchema = z.object({
  campaignId: z.string().min(1),
  id: z.string().min(1),
});

/** Crée un lien entre 2 entités de la campagne (membre uniquement). */
export async function createLink(input: unknown): Promise<LinkActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { campaignId, fromEntityId, toEntityId, label } = parsed.data;
  if (fromEntityId === toEntityId)
    return { ok: false, error: "Une entité ne peut pas se lier à elle-même." };

  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };

  const count = await prisma.entity.count({
    where: { campaignId, id: { in: [fromEntityId, toEntityId] } },
  });
  if (count !== 2) return { ok: false, error: "Entité introuvable dans cette campagne." };

  const duplicate = await prisma.entityLink.findFirst({
    where: {
      OR: [
        { fromEntityId, toEntityId },
        { fromEntityId: toEntityId, toEntityId: fromEntityId },
      ],
    },
  });
  if (duplicate) return { ok: false, error: "Un lien existe déjà entre ces deux entités." };

  await prisma.entityLink.create({
    data: { fromEntityId, toEntityId, label: label || null },
  });
  revalidatePath(`/campaign/${campaignId}/graph`);
  return { ok: true };
}

/** Supprime un lien de la campagne (membre uniquement). */
export async function deleteLink(input: unknown): Promise<LinkActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { campaignId, id } = parsed.data;

  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };

  const link = await prisma.entityLink.findUnique({
    where: { id },
    select: { fromEntity: { select: { campaignId: true } } },
  });
  if (!link || link.fromEntity.campaignId !== campaignId)
    return { ok: false, error: "Lien introuvable." };

  await prisma.entityLink.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/graph`);
  return { ok: true };
}
