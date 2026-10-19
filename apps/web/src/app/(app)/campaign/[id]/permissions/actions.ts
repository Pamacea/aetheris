"use server";

import { revalidatePath } from "next/cache";
import { campaignRoleSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type RoleResult = { ok: true } | { ok: false; error: string };

/**
 * Passe un membre en MJ ou joueur (Phase 10 — permissions).
 * Réservé aux MJ ; le dernier MJ d'une campagne ne peut jamais être
 * rétrogradé (sinon plus personne ne peut la gérer).
 */
export async function setMemberRole(
  campaignId: string,
  memberId: string,
  role: string,
): Promise<RoleResult> {
  const actor = await requireCampaignMember(campaignId);
  if (!actor || actor.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  const parsed = campaignRoleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Rôle invalide." };

  const member = await prisma.campaignMember.findFirst({
    where: { id: memberId, campaignId },
    select: { id: true, role: true },
  });
  if (!member) return { ok: false, error: "Membre introuvable." };
  if (parsed.data === member.role) return { ok: true };

  if (member.role === "GM") {
    const gms = await prisma.campaignMember.count({
      where: { campaignId, role: "GM" },
    });
    if (gms <= 1) {
      return { ok: false, error: "Impossible de rétrograder le dernier MJ." };
    }
  }

  await prisma.campaignMember.update({
    where: { id: member.id },
    data: { role: parsed.data },
  });
  revalidatePath(`/campaign/${campaignId}`);
  revalidatePath(`/campaign/${campaignId}/permissions`);
  return { ok: true };
}

/**
 * Accorde ou retire la vue d'un module étendu pour un membre (Phase 10 —
 * grants persistés sur `CampaignMember.permissions`). Réservé aux MJ ;
 * seul le refus est stocké (absence de clé = accès par défaut).
 */
export async function setMemberViewGrant(
  campaignId: string,
  memberId: string,
  moduleId: string,
  view: boolean,
): Promise<RoleResult> {
  const actor = await requireCampaignMember(campaignId);
  if (!actor || actor.role !== "GM") return { ok: false, error: "Réservé aux MJ." };
  if (typeof moduleId !== "string" || !/^[a-z][a-z0-9-]{0,31}$/.test(moduleId)) {
    return { ok: false, error: "Module invalide." };
  }

  const member = await prisma.campaignMember.findFirst({
    where: { id: memberId, campaignId },
    select: { id: true, role: true, permissions: true },
  });
  if (!member) return { ok: false, error: "Membre introuvable." };
  if (member.role === "GM") return { ok: false, error: "Le MJ voit toujours tout." };

  const perms = (member.permissions ?? {}) as { view?: Record<string, boolean> };
  const nextView = { ...(perms.view ?? {}) };
  if (view) delete nextView[moduleId];
  else nextView[moduleId] = false;

  await prisma.campaignMember.update({
    where: { id: member.id },
    data: { permissions: { ...(member.permissions as object), view: nextView } },
  });
  revalidatePath(`/campaign/${campaignId}`);
  revalidatePath(`/campaign/${campaignId}/permissions`);
  return { ok: true };
}
