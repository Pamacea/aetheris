import { noteBlocksSchema, templateSchemaSchema, type NoteBlock } from "@aetheris/shared";
import { parseWikiLinks, resolveLinkTarget, stripGmSecrets } from "@/lib/wiki";
import type { WikiGraphData, WikiTemplateMeta } from "./wiki-app";

/** Ligne brute `Entity` de Prisma utilisée par la vue du wiki. */
export type EntityRow = {
  id: string;
  title: string;
  folder: string | null;
  contentHtml: string | null;
  type: string;
  data: unknown;
};

type ActiveNote = {
  id: string;
  title: string;
  folder: string | null;
  contentHtml: string;
  type: string;
  data: Record<string, unknown>;
  blocks: NoteBlock[];
  template: WikiTemplateMeta | null;
};

type WikiView = {
  active: ActiveNote | null;
  backlinks: { id: string; title: string }[];
  graph: WikiGraphData;
};

/** Ligne brute `JsonTemplate` de Prisma (meta template indexée par type). */
type TemplateRow = { id: string; name: string; category: string | null; schema: unknown };

/** Ids des notes pointées par les champs « tag » (liens hors HTML). */
function tagTargetsOf(entity: EntityRow, templateById: Map<string, TemplateRow>): string[] {
  const template = templateById.get(entity.type);
  if (!template) return [];
  const schema = templateSchemaSchema.safeParse(template.schema);
  if (!schema.success) return [];
  const data = entity.data as Record<string, unknown>;
  return schema.data.fields
    .filter((f) => f.kind === "tag")
    .map((f) => data[f.id])
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** Retire la clé `blocks` (les blocs passent par `blocks`, filtrés). */
function withoutBlocks(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = { ...(data as Record<string, unknown>) };
  delete out.blocks;
  return out;
}

/**
 * Construction de la vue (note active, backlinks, graphe) avec filtrage
 * serveur : secrets MJ stripGmSecrets + blocs `gm` retirés côté serveur —
 * les joueurs ne reçoivent jamais ces données dans les props.
 */
export function resolveWikiView({
  activeMeta,
  noteEntities,
  templateById,
  isGM,
}: {
  activeMeta: EntityRow | null;
  noteEntities: EntityRow[];
  templateById: Map<string, TemplateRow>;
  isGM: boolean;
}): WikiView {
  const visibleHtml = (html: string | null): string => (isGM ? (html ?? "") : stripGmSecrets(html));
  const visibleBlocks = (data: unknown): NoteBlock[] => {
    const parsed = noteBlocksSchema.safeParse((data as { blocks?: unknown } | null)?.blocks);
    if (!parsed.success) return [];
    return isGM ? parsed.data : parsed.data.filter((b) => !b.gm);
  };

  const graph: WikiGraphData = {
    nodes: noteEntities.map((e) => ({ id: e.id, label: e.title })),
    links: [],
  };
  if (!activeMeta) return { active: null, backlinks: [], graph };

  const activeTemplate = templateById.get(activeMeta.type) ?? null;
  const active: ActiveNote = {
    id: activeMeta.id,
    title: activeMeta.title,
    folder: activeMeta.folder,
    contentHtml: visibleHtml(activeMeta.contentHtml),
    type: activeMeta.type,
    // Les blocs ne transitent jamais dans `data` : ils passent par `blocks`,
    // filtrés ci-dessus — pas de fuite gm.
    data: activeMeta.type === "note" ? {} : withoutBlocks(activeMeta.data),
    blocks: visibleBlocks(activeMeta.data),
    template: activeTemplate
      ? {
          id: activeTemplate.id,
          name: activeTemplate.name,
          category: activeTemplate.category,
          schema: activeTemplate.schema,
        }
      : null,
  };

  // Liens entrants : liens [[…]] du HTML + champs « tag » d'autres fiches.
  const needle = activeMeta.title.toLocaleLowerCase("fr");
  const htmlBacklinks = noteEntities
    .filter((e) => e.id !== activeMeta.id)
    .filter((e) =>
      parseWikiLinks(visibleHtml(e.contentHtml)).some((t) => t.toLocaleLowerCase("fr") === needle),
    );
  const tagBacklinks = noteEntities.filter(
    (e) => e.id !== activeMeta.id && tagTargetsOf(e, templateById).includes(activeMeta.id),
  );
  const seenIds = new Set<string>();
  const backlinks = [...htmlBacklinks, ...tagBacklinks]
    .filter((e) => {
      if (seenIds.has(e.id)) return false;
      seenIds.add(e.id);
      return true;
    })
    .map((e) => ({ id: e.id, title: e.title }));

  const seen = new Set<string>();
  const addEdge = (source: string, target: string) => {
    if (target === source) return;
    const key = `${source}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    graph.links.push({ source, target });
  };
  for (const source of noteEntities) {
    for (const link of parseWikiLinks(visibleHtml(source.contentHtml))) {
      const targetId = resolveLinkTarget(link, noteEntities);
      if (targetId) addEdge(source.id, targetId);
    }
    for (const target of tagTargetsOf(source, templateById)) {
      addEdge(source.id, target);
    }
  }

  return { active, backlinks, graph };
}
