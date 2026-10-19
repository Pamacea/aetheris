"use server";

import { revalidatePath } from "next/cache";
import { ambianceStateSchema, createPlaylistSchema, updatePlaylistSchema } from "@aetheris/shared";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";

type AmbianceActionResult = { ok: true; id: string } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Toutes les mutations d'ambiance sont réservées au MJ. */
async function requireGm(campaignId: string) {
  const member = await requireCampaignMember(campaignId);
  if (!member || member.role !== "GM") return null;
  return member;
}

function revalidateAmbiance(campaignId: string): void {
  revalidatePath(`/campaign/${campaignId}/ambiance`);
}

export async function createPlaylist(
  campaignId: string,
  input: unknown,
): Promise<AmbianceActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = createPlaylistSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const row = await prisma.ambiancePlaylist.create({
    data: { name: parsed.data.name, campaignId },
    select: { id: true },
  });
  revalidateAmbiance(campaignId);
  return { ok: true, id: row.id };
}

export async function updatePlaylist(
  campaignId: string,
  playlistId: string,
  input: unknown,
): Promise<AmbianceActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = updatePlaylistSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.issues[0]?.message ?? "Entrée invalide.");
  }

  const owned = await prisma.ambiancePlaylist.findFirst({
    where: { id: playlistId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Playlist introuvable.");

  await prisma.ambiancePlaylist.update({
    where: { id: playlistId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.tracks !== undefined ? { tracks: parsed.data.tracks as object } : {}),
    },
  });
  revalidateAmbiance(campaignId);
  return { ok: true, id: playlistId };
}

export async function deletePlaylist(
  campaignId: string,
  playlistId: string,
): Promise<AmbianceActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const owned = await prisma.ambiancePlaylist.findFirst({
    where: { id: playlistId, campaignId },
    select: { id: true },
  });
  if (!owned) return invalid("Playlist introuvable.");

  await prisma.ambiancePlaylist.delete({ where: { id: playlistId } });

  // Playlist associée / en lecture : on coupe l'état partagé.
  const row = await prisma.campaignAmbiance.findUnique({
    where: { campaignId },
    select: { state: true },
  });
  const state = ambianceStateSchema.safeParse(row?.state);
  if (state.success && state.data.playlistId === playlistId) {
    await prisma.campaignAmbiance.upsert({
      where: { campaignId },
      create: {
        campaignId,
        state: { ...state.data, playlistId: null, trackIndex: 0, playing: false },
      },
      update: {
        state: { playlistId: null, trackIndex: 0, playing: false },
      },
    });
  }

  revalidateAmbiance(campaignId);
  return { ok: true, id: playlistId };
}

/** Persistance de l'état de lecture partagé (commit du MJ). */
export async function saveAmbianceState(
  campaignId: string,
  input: unknown,
): Promise<AmbianceActionResult> {
  if (!(await requireGm(campaignId))) return invalid("Réservé aux MJ.");

  const parsed = ambianceStateSchema.safeParse(input);
  if (!parsed.success) return invalid("État d'ambiance invalide.");

  await prisma.campaignAmbiance.upsert({
    where: { campaignId },
    create: { campaignId, state: parsed.data as object },
    update: { state: parsed.data as object },
  });
  return { ok: true, id: campaignId };
}
