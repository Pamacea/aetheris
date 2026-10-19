"use server";

import { revalidatePath } from "next/cache";
import { createHandoutSchema, updateHandoutSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type HandoutActionResult = { ok: true; id: string } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Toutes les mutations du journal sont réservées au MJ. */
async function requireGm(campaignId: string) {
  const member = await requireCampaignMember(campaignId);
  if (!member || member.role !== "GM") return null;
  return member;
}

function revalidateJournal(campaignId: string): void {
  revalidatePath(`/campaign/${campaignId}/journal`);
}

export async function createHandout(
  campaignId: string,
  input: unknown,
): Promise<HandoutActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = createHandoutSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const entry = await prisma.journalEntry.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      imageUrl: parsed.data.imageUrl ?? null,
      campaignId,
    },
    select: { id: true },
  });
  revalidateJournal(campaignId);
  return { ok: true, id: entry.id };
}

export async function updateHandout(
  campaignId: string,
  entryId: string,
  input: unknown,
): Promise<HandoutActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = updateHandoutSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const owned = await prisma.journalEntry.findFirst({
    where: { id: entryId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Handout introuvable.");

  await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
      ...(parsed.data.shared !== undefined ? { shared: parsed.data.shared } : {}),
    },
  });
  revalidateJournal(campaignId);
  return { ok: true, id: entryId };
}

export async function deleteHandout(
  campaignId: string,
  entryId: string,
): Promise<HandoutActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const owned = await prisma.journalEntry.findFirst({
    where: { id: entryId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Handout introuvable.");

  await prisma.journalEntry.delete({ where: { id: entryId } });
  revalidateJournal(campaignId);
  return { ok: true, id: entryId };
}
