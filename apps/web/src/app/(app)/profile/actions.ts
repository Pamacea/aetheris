"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UpdateProfileState = { ok: true } | { ok: false; error: string };

export async function updateProfileName(formData: FormData): Promise<UpdateProfileState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Non authentifié." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) {
    return { ok: false, error: "Nom : 1 à 80 caractères." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/profile");
  return { ok: true };
}
