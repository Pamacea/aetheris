import type { WikiTemplateMeta } from "@/features/wiki/types";

export type FicheRow = {
  id: string;
  title: string;
  templateName: string;
  schemaRaw: unknown;
  data: Record<string, unknown>;
};

type EntityRow = { id: string; title: string; type: string; data: unknown };

/** Retire la clé `blocks` héritée de l'ancien panneau Blocs (jamais un champ de fiche). */
function withoutBlocks(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = { ...(data as Record<string, unknown>) };
  delete out.blocks;
  return out;
}

/**
 * Liste des fiches : entités de campagne dont le type est l'id d'un template
 * (les notes libres et les types orphelins sont écartés).
 */
export function selectFiches(entities: EntityRow[], templates: WikiTemplateMeta[]): FicheRow[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return entities.flatMap((e) => {
    const template = byId.get(e.type);
    if (!template) return [];
    return [
      {
        id: e.id,
        title: e.title,
        templateName: template.name,
        schemaRaw: template.schema,
        data: withoutBlocks(e.data),
      },
    ];
  });
}
