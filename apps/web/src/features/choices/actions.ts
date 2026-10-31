"use server";

import { createChoiceSchema, resolveChoiceSchema, voteChoiceSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { canViewModule } from "@/lib/grants";
import { choiceSelect, toChoiceView, type ChoiceView } from "./choice-view";
import { clampOptionIndex, parseOptions } from "./vote-logic";

type ChoiceActionResult = { ok: true; choice: ChoiceView } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Ligne complète (votes inclus) → vue client, pour la réponse de l'action. */
async function reloadChoice(
  campaignId: string,
  choiceId: string,
  userId: string,
  isGM: boolean,
): Promise<ChoiceActionResult> {
  const row = await prisma.playerChoice.findFirst({
    where: { id: choiceId, campaignId },
    select: choiceSelect(isGM),
  });
  const choice = row ? toChoiceView(row, userId, isGM) : null;
  return choice ? { ok: true, choice } : invalid("Choix introuvable.");
}

/** Membre + choix appartenant à la campagne ; null si absent (404 silencieux). */
async function requireChoice(campaignId: string, choiceId: string) {
  const member = await requireCampaignMember(campaignId);
  if (!member) return null;
  const choice = await prisma.playerChoice.findFirst({
    where: { id: choiceId, campaignId },
    select: { id: true, options: true, status: true },
  });
  if (!choice) return null;
  return { member, choice };
}

/** Options Json → libellés valides + index clampé dans leurs bornes. */
function resolveIndex(
  rawIndex: number,
  optionsJson: unknown,
): { options: string[]; index: number } | null {
  const options = parseOptions(optionsJson);
  if (!options) return null;
  const index = clampOptionIndex(rawIndex, options.length);
  if (index === null) return null;
  return { options, index };
}

export async function createChoice(
  campaignId: string,
  input: unknown,
): Promise<ChoiceActionResult> {
  const member = await requireCampaignMember(campaignId);
  if (!member) return invalid("Non connecté ou accès refusé.");
  if (member.role !== "GM") return invalid("Réservé aux MJ.");

  const parsed = createChoiceSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const created = await prisma.playerChoice.create({
    data: {
      prompt: parsed.data.prompt,
      options: parsed.data.options,
      campaignId,
    },
    select: { id: true },
  });
  return reloadChoice(campaignId, created.id, member.userId, true);
}

/** Vote d'un joueur : 1 vote/joueur (upsert), modifiable tant qu'ouvert. */
export async function castVote(
  campaignId: string,
  choiceId: string,
  input: unknown,
): Promise<ChoiceActionResult> {
  const parsed = voteChoiceSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const ctx = await requireChoice(campaignId, choiceId);
  if (!ctx) return invalid("Non connecté ou choix introuvable.");
  // La page filtre déjà, mais un module masqué doit aussi refuser l'écriture.
  if (!canViewModule(ctx.member.permissions, "choices", ctx.member.role)) {
    return invalid("Module Choix désactivé.");
  }
  if (ctx.choice.status !== "open") return invalid("Ce choix est clôturé.");

  const resolved = resolveIndex(parsed.data.optionIndex, ctx.choice.options);
  if (!resolved) return invalid("Option invalide.");

  const comment = parsed.data.comment ?? "";
  await prisma.choiceVote.upsert({
    where: { choiceId_userId: { choiceId, userId: ctx.member.userId } },
    create: {
      choiceId,
      userId: ctx.member.userId,
      optionIndex: resolved.index,
      comment: comment === "" ? null : comment,
    },
    update: {
      optionIndex: resolved.index,
      comment: comment === "" ? null : comment,
    },
  });
  const isGM = ctx.member.role === "GM";
  return reloadChoice(campaignId, choiceId, ctx.member.userId, isGM);
}

/** Clôture (MJ) : le choix passe à `resolved` avec l'option retenue. */
export async function resolveChoice(
  campaignId: string,
  choiceId: string,
  input: unknown,
): Promise<ChoiceActionResult> {
  const parsed = resolveChoiceSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const ctx = await requireChoice(campaignId, choiceId);
  if (!ctx) return invalid("Non connecté ou choix introuvable.");
  if (ctx.member.role !== "GM") return invalid("Réservé aux MJ.");
  if (ctx.choice.status !== "open") return invalid("Ce choix est déjà clôturé.");

  const resolved = resolveIndex(parsed.data.resolvedOption, ctx.choice.options);
  if (!resolved) return invalid("Option invalide.");

  await prisma.playerChoice.update({
    where: { id: choiceId },
    data: { status: "resolved", resolvedOption: resolved.index },
  });
  return reloadChoice(campaignId, choiceId, ctx.member.userId, true);
}

/** Fermeture sans retenir d'option (MJ) : plus aucun vote accepté. */
export async function closeChoice(
  campaignId: string,
  choiceId: string,
): Promise<ChoiceActionResult> {
  const ctx = await requireChoice(campaignId, choiceId);
  if (!ctx) return invalid("Non connecté ou choix introuvable.");
  if (ctx.member.role !== "GM") return invalid("Réservé aux MJ.");
  if (ctx.choice.status !== "open") return invalid("Ce choix est déjà clôturé.");

  await prisma.playerChoice.update({
    where: { id: choiceId },
    data: { status: "closed" },
  });
  return reloadChoice(campaignId, choiceId, ctx.member.userId, true);
}

/** Archivage (MJ) d'un choix déjà fermé/résolu : masqué de la liste active. */
export async function archiveChoice(
  campaignId: string,
  choiceId: string,
): Promise<ChoiceActionResult> {
  const ctx = await requireChoice(campaignId, choiceId);
  if (!ctx) return invalid("Non connecté ou choix introuvable.");
  if (ctx.member.role !== "GM") return invalid("Réservé aux MJ.");
  if (ctx.choice.status === "open")
    return invalid("Fermez ou résolvez le choix avant de l'archiver.");
  if (ctx.choice.status === "archived") return invalid("Ce choix est déjà archivé.");

  await prisma.playerChoice.update({
    where: { id: choiceId },
    data: { status: "archived" },
  });
  return reloadChoice(campaignId, choiceId, ctx.member.userId, true);
}
