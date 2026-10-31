"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sceneStateSchema, templateSchemaSchema, type SceneState } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { canViewModule } from "@/lib/grants";
import { combatEntityData } from "./entity-link";

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
  // L'état complet (murs, brouillard, carte, jetons) est réservé au MJ : le
  // joueur passe par `scene:commit`, qui ne l'autorise qu'à ses PV/CA/vision.
  if (member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

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

const combatSchema = z.object({
  hp: z.number().min(0).max(9999).nullable(),
  hpMax: z.number().min(0).max(9999).nullable(),
  ac: z.number().int().min(0).max(99).nullable(),
});

type CombatResult = { ok: true } | { ok: false; error: string };

/**
 * Écrit PV/PV max/CA du token dans la fiche liée. Autorisé au MJ, ou au
 * propriétaire du token qui porte cette fiche dans la scène de la campagne.
 */
export async function saveTokenCombat(
  campaignId: string,
  entityId: string,
  combat: unknown,
): Promise<CombatResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return { ok: false, error: "Accès refusé." };
  // Grant de vue de la Table : même un jeton possédé ne s'édite pas sans accès
  // au module. canViewModule laisse toujours passer le MJ.
  if (!canViewModule(member.permissions, "vtt", member.role)) {
    return { ok: false, error: "Module Table désactivé." };
  }

  const parsed = combatSchema.safeParse(combat);
  if (!parsed.success) return { ok: false, error: "Valeurs de combat invalides." };

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, campaignId },
    select: { id: true, type: true, data: true, gmOnly: true },
  });
  if (!entity) return { ok: false, error: "Fiche introuvable." };
  if (entity.gmOnly && member.role !== "GM") return { ok: false, error: "Réservé aux MJ." };

  if (member.role !== "GM") {
    const scene = await prisma.vttScene.findUnique({ where: { campaignId } });
    const state = sceneStateSchema.safeParse(scene?.state);
    const owns = state.success
      ? state.data.tokens.some((t) => t.noteId === entityId && t.ownerId === member.userId)
      : false;
    if (!owns) return { ok: false, error: "Jeton non possédé." };
  }

  // Schéma du template : résolution des ids/libellés libres des modèles custom.
  const template = await prisma.jsonTemplate.findFirst({
    where: { id: entity.type, campaignId },
    select: { schema: true },
  });
  const parsedTemplate = template ? templateSchemaSchema.safeParse(template.schema) : null;
  const schema = parsedTemplate?.success ? parsedTemplate.data : null;

  const previous = entity.data as Record<string, unknown> | null;
  const patch = combatEntityData(parsed.data, { title: "", data: previous ?? {} }, schema);
  // Aucune clé de combat résolue : ne rien écrire plutôt que d'inventer pv/pv_max/ca.
  if (Object.keys(patch).length === 0) return { ok: true };

  await prisma.entity.update({
    where: { id: entity.id },
    // Fusion : seules les clés de combat sont touchées, le reste de la fiche
    // (blocs, CSS, champs du template) est conservé.
    data: { data: { ...(previous ?? {}), ...patch } as object },
  });

  // Pas de revalidation du VTT : le token local est déjà à jour et un refresh
  // RSC de la table pendant un drag réinitialiserait la scène.
  revalidatePath(`/campaign/${campaignId}/wiki`);
  return { ok: true };
}
