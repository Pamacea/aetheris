"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { campaignRoleSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { applyViewGrant, viewGrantError } from "./grant-logic";
import { roleChangeError } from "./role-logic";

type ActionResult = { ok: true } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function revalidatePermissions(campaignId: string): void {
  revalidatePath(`/campaign/${campaignId}`);
  revalidatePath(`/campaign/${campaignId}/permissions`);
}

/**
 * Passe un membre en MJ ou joueur. Réservé aux MJ — vérifié ici, côté
 * serveur ; le dernier MJ et l'auto-rétrogradation sont protégés par
 * `roleChangeError` (logique pure testée).
 */
export async function setMemberRole(
  campaignId: string,
  memberId: string,
  role: string,
): Promise<ActionResult> {
  const actor = await requireCampaignMember(campaignId);
  if (!actor) return invalid("Non connecté ou accès refusé.");
  if (actor.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = campaignRoleSchema.safeParse(role);
  if (!parsed.success) return invalid("Rôle invalide.");

  const target = await prisma.campaignMember.findFirst({
    where: { id: memberId, campaignId },
    select: { id: true, userId: true, role: true },
  });
  if (!target) return invalid("Membre introuvable.");
  if (parsed.data === target.role) return { ok: true };

  const gmCount = await prisma.campaignMember.count({
    where: { campaignId, role: "GM" },
  });
  const error = roleChangeError({
    actorRole: actor.role,
    actorUserId: actor.userId,
    targetUserId: target.userId,
    targetRole: target.role,
    nextRole: parsed.data,
    gmCount,
  });
  if (error) return invalid(error);

  await prisma.campaignMember.update({
    where: { id: target.id },
    data: { role: parsed.data },
  });
  revalidatePermissions(campaignId);
  return { ok: true };
}

/**
 * Accorde ou retire la vue d'un module pour un joueur. Réservé aux MJ ;
 * seul le refus est persisté sur `CampaignMember.permissions.view`
 * (absence de clé = accès par défaut, relu par `lib/canViewModule`).
 */
export async function setMemberViewGrant(
  campaignId: string,
  memberId: string,
  moduleId: string,
  view: boolean,
): Promise<ActionResult> {
  const actor = await requireCampaignMember(campaignId);
  if (!actor) return invalid("Non connecté ou accès refusé.");
  if (actor.role !== "GM") return invalid("Réservé aux MJ.");
  if (typeof moduleId !== "string" || typeof view !== "boolean") {
    return invalid("Entrée invalide.");
  }

  const target = await prisma.campaignMember.findFirst({
    where: { id: memberId, campaignId },
    select: { id: true, role: true, permissions: true },
  });
  if (!target) return invalid("Membre introuvable.");

  const error = viewGrantError(moduleId, target.role);
  if (error) return invalid(error);

  await prisma.campaignMember.update({
    where: { id: target.id },
    data: {
      permissions: applyViewGrant(target.permissions, moduleId, view) as Prisma.InputJsonValue,
    },
  });
  revalidatePermissions(campaignId);
  return { ok: true };
}
