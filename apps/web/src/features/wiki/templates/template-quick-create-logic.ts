import { TEMPLATE_PRESETS, type TemplatePreset } from "@aetheris/shared";

/** Presets exposés en création rapide (un clic → modèle + entrée). */
const QUICK_PRESET_IDS = new Set(["personnage", "lieu", "objet_magique"]);

export const QUICK_CREATE_PRESETS: TemplatePreset[] = TEMPLATE_PRESETS.filter((p) =>
  QUICK_PRESET_IDS.has(p.id),
);

/** Modèle existant portant déjà le nom du preset (casse et espaces ignorés). */
export function findTemplateByName<T extends { id: string; name: string }>(
  templates: T[],
  name: string,
): T | undefined {
  const wanted = name.trim().toLowerCase();
  return templates.find((t) => t.name.trim().toLowerCase() === wanted);
}
