import { createCampaignSchema } from "@aetheris/shared";

export type CreateCampaignResult =
  | { success: true; data: { title: string; theme: string; gameSystem: string } }
  | { success: false; error: string };

/** Frontière de validation du formulaire de création (Zod partagé). */
export function parseCreateCampaign(formData: FormData): CreateCampaignResult {
  const rawTitle = formData.get("title");
  const parsed = createCampaignSchema.safeParse({
    // trim avant min(1) : «   » n'est pas un titre.
    title: typeof rawTitle === "string" ? rawTitle.trim() : rawTitle,
    theme: formData.get("theme") ?? "pandemonium",
    gameSystem: formData.get("gameSystem") ?? "custom",
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  return { success: true, data: parsed.data };
}
