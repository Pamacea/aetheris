import type { z } from "zod";
import { createCampaignSchema } from "@aetheris/shared";

/** Champs modifiables dans « Réglages » (reprise du schéma de création partagé). */
const settingsSchema = createCampaignSchema.pick({
  title: true,
  coverImage: true,
  logo: true,
  gameSystem: true,
});

export type CampaignSettingsData = z.infer<typeof settingsSchema>;

export type CampaignSettingsResult =
  | { success: true; data: CampaignSettingsData }
  | { success: false; error: string };

/** Champ texte : trim, et vide → absent (permet d'effacer couverture/logo). */
function raw(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Frontière de validation du formulaire de réglages (Zod partagé). */
export function parseCampaignSettings(formData: FormData): CampaignSettingsResult {
  const title = raw(formData, "title");
  if (!title) return { success: false, error: "Titre de campagne requis." };

  const parsed = settingsSchema.safeParse({
    title,
    coverImage: raw(formData, "coverImage"),
    logo: raw(formData, "logo"),
    gameSystem: raw(formData, "gameSystem") ?? "custom",
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  return { success: true, data: parsed.data };
}
