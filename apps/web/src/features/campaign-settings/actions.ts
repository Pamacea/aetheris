"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sanitizeCss, saveCampaignThemeSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { parseCampaignSettings } from "./validate";

/** État des formulaires de réglages (useActionState) — succès ou erreur affichée. */
export type SettingsFormState = { ok: true } | { ok: false; error: string } | null;

type SettingsActionResult = { ok: true } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function revalidateSettings(campaignId: string): void {
  revalidatePath(`/campaign/${campaignId}`);
  revalidatePath(`/campaign/${campaignId}/settings`);
}

/** Toute écriture dans les réglages est MJ (membre + rôle GM vérifiés côté serveur). */
async function requireGm(campaignId: string): Promise<{ ok: false; error: string } | null> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Non connecté ou accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");
  return null;
}

/** Informations campagne : titre, couverture, logo, système de jeu. */
export async function saveCampaignSettings(
  campaignId: string,
  formData: FormData,
): Promise<SettingsActionResult> {
  const denied = await requireGm(campaignId);
  if (denied) return denied;

  const parsed = parseCampaignSettings(formData);
  if (!parsed.success) return invalid(parsed.error);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      title: parsed.data.title,
      gameSystem: parsed.data.gameSystem,
      // absent du formulaire = effacé (null), pas « inchangé » (undefined)
      coverImage: parsed.data.coverImage ?? null,
      logo: parsed.data.logo ?? null,
    },
  });
  revalidateSettings(campaignId);
  return { ok: true };
}

/**
 * Sauvegarde le CSS / JS custom de la campagne. Réservé au MJ ; le CSS est
 * sanitisé avant écriture (le JS, lui, ne s'exécute jamais dans le DOM parent
 * — iframe sandboxé uniquement, voir ThemeInjector pour la lecture).
 */
export async function saveCampaignTheme(
  campaignId: string,
  input: unknown,
): Promise<SettingsActionResult> {
  const denied = await requireGm(campaignId);
  if (denied) return denied;

  const parsed = saveCampaignThemeSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const clean = sanitizeCss(parsed.data.css);
  if (!clean.ok) return invalid(clean.error);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      customStyles: clean.css || null,
      customScript: parsed.data.js || null,
    },
  });
  revalidateSettings(campaignId);
  return { ok: true };
}

/** Régénère le code d'invitation (MJ) : l'ancien code cesse immédiatement de valoir. */
export async function regenerateInviteCode(campaignId: string): Promise<SettingsActionResult> {
  const denied = await requireGm(campaignId);
  if (denied) return denied;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { inviteCode: randomUUID() },
  });
  revalidateSettings(campaignId);
  return { ok: true };
}
