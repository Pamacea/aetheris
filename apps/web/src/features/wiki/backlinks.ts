import { templateSchemaSchema } from "@aetheris/shared";
import { parseWikiLinkIds, parseWikiLinks, stripGmSecrets } from "@/lib/wiki";
import type { WikiTemplateMeta } from "./types";

/** Ligne d'entrée nécessaire au calcul des liens entrants. */
export interface BacklinkSource {
  id: string;
  title: string;
  contentHtml: string | null;
  /** templateId ou "note". */
  type: string;
  data: unknown;
}

/** Ids des notes pointées par les champs « tag » (liens hors HTML). */
function tagTargetsOf(
  source: BacklinkSource,
  templateById: Map<string, WikiTemplateMeta>,
): string[] {
  const template = templateById.get(source.type);
  if (!template) return [];
  const schema = templateSchemaSchema.safeParse(template.schema);
  if (!schema.success) return [];
  const data =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? (source.data as Record<string, unknown>)
      : {};
  return schema.data.fields
    .filter((f) => f.kind === "tag")
    .map((f) => data[f.id])
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

/**
 * Liens entrants de l'entrée active : liens [[…]] du HTML (secrets MJ
 * strippés pour un joueur, miroir du filtre appliqué à contentHtml) +
 * champs « tag » d'autres fiches, sans doublon ni auto-référence.
 */
export function resolveBacklinks({
  active,
  entries,
  templates,
  isGM,
}: {
  active: { id: string; title: string } | null;
  entries: BacklinkSource[];
  templates: WikiTemplateMeta[];
  isGM: boolean;
}): { id: string; title: string }[] {
  if (!active) return [];
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const visibleHtml = (html: string | null): string => (isGM ? (html ?? "") : stripGmSecrets(html));
  const needle = active.title.toLocaleLowerCase("fr");

  const htmlSources = entries.filter((e) => {
    const html = visibleHtml(e.contentHtml);
    // L'id (liens récents) est O(1) et résiste au renommage ; le titre reste
    // le repli des contenus antérieurs.
    if (parseWikiLinkIds(html).includes(active.id)) return true;
    return parseWikiLinks(html).some((t) => t.toLocaleLowerCase("fr") === needle);
  });
  const tagSources = entries.filter((e) => tagTargetsOf(e, templateById).includes(active.id));

  const seen = new Set<string>();
  return [...htmlSources, ...tagSources]
    .filter((e) => {
      if (e.id === active.id || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map((e) => ({ id: e.id, title: e.title }));
}
