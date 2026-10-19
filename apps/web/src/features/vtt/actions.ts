"use server";

import { sceneStateSchema, type SceneState } from "@aetheris/shared";
import { requireCampaignMember } from "@/lib/campaign-server";
import { prisma } from "@/lib/prisma";

export type SaveSceneResult = { ok: true } | { ok: false; error: string };

/**
 * Persistance de repli de la table (chemin principal : `scene:commit` via
 * la socket, qui persiste + broadcast). Utilisé quand la socket est coupée —
 * le débounce (500 ms) vit côté client dans `useVttSocket`.
 * Zod d'abord : aucune forme inconnue n'atteint la colonne `state`.
 */
export async function saveSceneState(
  campaignId: string,
  state: SceneState,
): Promise<SaveSceneResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };

  const parsed = sceneStateSchema.safeParse(state);
  if (!parsed.success) return { ok: false, error: "État de scène invalide." };

  try {
    await prisma.vttScene.upsert({
      where: { campaignId },
      create: { campaignId, state: parsed.data as object },
      update: { state: parsed.data as object },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Sauvegarde impossible." };
  }
}
