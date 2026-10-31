import {
  createCampaignWithSystemSchema,
  type CreateCampaignWithSystemInput,
} from "@aetheris/shared";

export type CreateCampaignResult =
  | { success: true; data: CreateCampaignWithSystemInput }
  | { success: false; error: string };

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Frontière de validation de l'assistant de création (Zod partagé). */
export function parseCreateCampaign(formData: FormData): CreateCampaignResult {
  const rawTitle = formData.get("title");
  const parsed = createCampaignWithSystemSchema.safeParse({
    // trim avant min(1) : «   » n'est pas un titre.
    title: typeof rawTitle === "string" ? rawTitle.trim() : rawTitle,
    theme: formData.get("theme") ?? "pandemonium",
    gameSystem: formData.get("gameSystem") ?? "custom",
    description: text(formData, "description"),
    visibility: formData.get("visibility") ?? "private",
    gameSystemId: text(formData, "gameSystemId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
    };
  }
  return { success: true, data: parsed.data };
}
