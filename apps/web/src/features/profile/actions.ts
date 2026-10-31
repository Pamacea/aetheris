"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CreateApiKeyState =
  | { ok: true; token: string; name: string }
  | { ok: false; error: string }
  | null;

type RevokeResult = { ok: true } | { ok: false; error: string };

const EXPIRATION_VALUES = new Set(["0", "30", "90", "365"]);

const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nom requis.")
    .max(64, "Le nom ne peut pas dépasser 64 caractères."),
  expirationDays: z
    .string()
    .refine((value) => EXPIRATION_VALUES.has(value), "Expiration invalide."),
});

async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

/**
 * Crée une clé API personnelle. Le token clair est renvoyé une seule fois :
 * la base ne conserve que son préfixe et son sha256.
 */
export async function createApiKey(formData: FormData): Promise<CreateApiKeyState> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Non connecté." };

  const parsed = createApiKeySchema.safeParse({
    name: formData.get("name") ?? "",
    expirationDays: formData.get("expirationDays") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const days = Number(parsed.data.expirationDays);
  const token = `aeth_${randomBytes(32).toString("base64url")}`;
  const prefix = token.slice(0, 8);
  const hashedKey = createHash("sha256").update(token).digest("hex");
  const expiresAt = days === 0 ? null : new Date(Date.now() + days * 86_400_000);

  await prisma.apiKey.create({
    data: { userId, name: parsed.data.name, prefix, hashedKey, expiresAt },
  });

  revalidatePath("/profile");
  return { ok: true, token, name: parsed.data.name };
}

/** Révoque une clé de l'utilisateur connecté (ownership vérifié dans la requête). */
export async function revokeApiKey(id: string): Promise<RevokeResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Non connecté." };
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Clé invalide." };
  }

  const result = await prisma.apiKey.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) {
    return { ok: false, error: "Clé introuvable ou déjà révoquée." };
  }

  revalidatePath("/profile");
  return { ok: true };
}
