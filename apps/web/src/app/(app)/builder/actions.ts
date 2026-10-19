"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createGameSystemSchema } from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type GameSystemResult = { ok: true } | { ok: false; error: string };

/**
 * CRUD des systèmes de jeu dans /builder — la création passe par le
 * dialog du dashboard (`create-game-system-dialog.tsx`, réutilisé tel quel),
 * la suppression/le renommage par ces actions (propriétaire uniquement).
 */
async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function updateGameSystem(id: string, input: unknown): Promise<GameSystemResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Non authentifié." };

  const parsed = createGameSystemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }

  const owned = await prisma.gameSystem.findFirst({
    where: { id, authorId: session.user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Système introuvable." };

  await prisma.gameSystem.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });
  revalidatePath("/builder");
  return { ok: true };
}

export async function deleteGameSystem(id: string): Promise<GameSystemResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "Non authentifié." };

  const owned = await prisma.gameSystem.findFirst({
    where: { id, authorId: session.user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Système introuvable." };

  // Le lien campagne → système est une simple String (pas de FK) :
  // refuser si encore référencé plutôt que de casser silencieusement un libellé.
  const usedBy = await prisma.campaign.count({ where: { gameSystem: id } });
  if (usedBy > 0) {
    return {
      ok: false,
      error: `Utilisé par ${usedBy} campagne${usedBy > 1 ? "s" : ""} — changez d'abord son système de jeu.`,
    };
  }

  await prisma.gameSystem.delete({ where: { id } });
  revalidatePath("/builder");
  return { ok: true };
}
