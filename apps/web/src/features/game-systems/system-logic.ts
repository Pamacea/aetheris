import {
  buildCharacteristicTemplate,
  gameSystemImportSchema,
  getPresetGameSystem,
  systemTemplateSeedListSchema,
  systemTemplateSeedSchema,
  type CreateCustomGameSystemInput,
  type GameSystemImport,
  type SystemAsset,
  type SystemTemplateSeed,
  type TemplatePreset,
} from "@aetheris/shared";

/** 200 Ko : borne de lecture avant même le parse JSON (import fichier). */
export const SYSTEM_IMPORT_MAX_BYTES = 200_000;

export type ParsedSystemImport =
  | { success: true; data: GameSystemImport }
  | { success: false; error: string };

/**
 * Frontière d'import JSON : accepte une chaîne (fichier) ou un objet déjà
 * parsé, puis applique le schéma Zod strict partagé.
 */
export function parseSystemImport(raw: unknown): ParsedSystemImport {
  let value = raw;
  if (typeof raw === "string") {
    if (raw.length > SYSTEM_IMPORT_MAX_BYTES) {
      return { success: false, error: "Fichier trop volumineux (200 Ko maximum)." };
    }
    try {
      value = JSON.parse(raw);
    } catch {
      return { success: false, error: "JSON invalide." };
    }
  }
  const parsed = gameSystemImportSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Format de système invalide.",
    };
  }
  return { success: true, data: parsed.data };
}

/** Payload d'export du builder : même forme que l'entrée d'import (aucun asset). */
export function systemExportPayload(input: CreateCustomGameSystemInput): GameSystemImport {
  return { ...input, assets: [] };
}

/** Modèles seedés : explicites, sinon dérivés des caractéristiques homebrew. */
export function templatesForImportedSystem(payload: GameSystemImport): SystemTemplateSeed[] {
  if (payload.templates?.length) return payload.templates;
  return payload.characteristics ? [buildCharacteristicTemplate(payload.characteristics)] : [];
}

export function assetsForImportedSystem(payload: GameSystemImport): SystemAsset[] {
  return payload.assets ?? [];
}

export type ParsedTemplateSeeds =
  | { success: true; seeds: SystemTemplateSeed[] }
  | { success: false; error: string };

/** Valide les `defaultTemplates` stockés en base avant de seeder une campagne. */
export function templateSeedsFromDefaults(raw: unknown): ParsedTemplateSeeds {
  const parsed = systemTemplateSeedListSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Modèles du système invalides." };
  }
  return { success: true, seeds: parsed.data };
}

/**
 * Presets « Mes presets » du builder : les modèles seedés du système de la
 * campagne, relus tolérants (une entrée corrompue est ignorée, jamais bloquante).
 */
export function presetsFromTemplates(raw: unknown): TemplatePreset[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: TemplatePreset[] = [];
  list.forEach((entry, i) => {
    const parsed = systemTemplateSeedSchema.safeParse(entry);
    if (!parsed.success) return;
    const seed = parsed.data;
    out.push({
      id: `systeme-${i}`,
      name: seed.name,
      ...(seed.category ? { category: seed.category } : {}),
      ...(seed.description ? { description: seed.description } : {}),
      ...(seed.customCss ? { customCss: seed.customCss } : {}),
      schema: seed.schema,
    });
  });
  return out;
}

/** Modèles d'un preset officiel (utilisé par les tests et le fallback serveur). */
export function presetTemplateSeeds(id: string): SystemTemplateSeed[] | null {
  return getPresetGameSystem(id)?.templates ?? null;
}
