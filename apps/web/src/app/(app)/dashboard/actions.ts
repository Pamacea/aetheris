"use server";

import { createCampaignSchema, createGameSystemSchema } from "@aetheris/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CreateCampaignState = { ok: true } | { ok: false; error: string };
export type JoinCampaignState = { ok: true; id: string } | { ok: false; error: string };

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function createCampaign(formData: FormData): Promise<CreateCampaignState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Non authentifié." };

  const parsed = createCampaignSchema.safeParse({
    title: formData.get("title"),
    theme: formData.get("theme") ?? "pandemonium",
    customThemeScript: emptyToUndefined(formData.get("customThemeScript")),
    gameSystem: formData.get("gameSystem") ?? "custom",
    coverImage: emptyToUndefined(formData.get("coverImage")),
    logo: emptyToUndefined(formData.get("logo")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.campaign.create({
    data: {
      title: parsed.data.title,
      theme: parsed.data.theme,
      customThemeScript: parsed.data.customThemeScript ?? null,
      gameSystem: parsed.data.gameSystem,
      coverImage: parsed.data.coverImage ?? null,
      logo: parsed.data.logo ?? null,
      members: { create: { userId: session.user.id, role: "GM" } },
    },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Rejoint une campagne par son code d'invitation (membre PLAYER, idempotent). */
export async function joinCampaignByCode(formData: FormData): Promise<JoinCampaignState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Non authentifié." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { ok: false, error: "Code d'invitation requis." };

  const campaign = await prisma.campaign.findUnique({
    where: { inviteCode: code },
    select: { id: true },
  });
  if (!campaign) return { ok: false, error: "Code d'invitation inconnu." };

  await prisma.campaignMember.upsert({
    where: { userId_campaignId: { userId: session.user.id, campaignId: campaign.id } },
    create: { userId: session.user.id, campaignId: campaign.id, role: "PLAYER" },
    update: {},
  });

  revalidatePath("/dashboard");
  return { ok: true, id: campaign.id };
}

export async function createGameSystem(formData: FormData): Promise<CreateCampaignState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Non authentifié." };

  const parsed = createGameSystemSchema.safeParse({
    name: formData.get("name"),
    description: emptyToUndefined(formData.get("description")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.gameSystem.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      authorId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
