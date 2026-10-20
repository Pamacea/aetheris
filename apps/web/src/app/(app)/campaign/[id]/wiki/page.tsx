import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { stripGmSecrets } from "@/lib/wiki";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { resolveBacklinks } from "@/features/wiki/backlinks";
import { WikiApp } from "@/features/wiki/wiki-app";
import type { WikiTemplateMeta } from "@/features/wiki/types";

/** Retire la clé `blocks` héritée de l'ancien panneau Blocs (jamais un champ de fiche). */
function withoutBlocks(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = { ...(data as Record<string, unknown>) };
  delete out.blocks;
  return out;
}

export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { member } = await requireCampaignPage(id, "wiki");
  const isGM = member.role === "GM";

  const [entities, rawTemplates] = await Promise.all([
    prisma.entity.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        title: true,
        folder: true,
        contentHtml: true,
        type: true,
        data: true,
        shareSlug: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.jsonTemplate.findMany({
      where: { campaignId: id },
      select: { id: true, name: true, category: true, schema: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const templates: WikiTemplateMeta[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    schema: t.schema,
  }));
  const templateById = new Map(rawTemplates.map((t) => [t.id, t]));

  // L'entité legacy « block-lib » (bibliothèque de blocs) n'est pas une note.
  const rows = entities.filter((e) => e.type !== "block-lib");
  const activeMeta = rows.find((e) => e.id === sp.note) ?? rows[0] ?? null;
  const activeTemplate = activeMeta ? (templateById.get(activeMeta.type) ?? null) : null;

  const active = activeMeta
    ? {
        id: activeMeta.id,
        title: activeMeta.title,
        folder: activeMeta.folder,
        // Joueur : secrets MJ stripés côté serveur — jamais dans les props.
        contentHtml:
          (isGM ? activeMeta.contentHtml : stripGmSecrets(activeMeta.contentHtml)) || "<p></p>",
        shareSlug: isGM ? activeMeta.shareSlug : null,
        type: activeMeta.type,
        // `data` ne porte aucun marqueur gm-secret (valeurs de fiche échappées
        // au rendu) : transmis tel quel, comme le faisait l'ancien wiki.
        data: withoutBlocks(activeMeta.data),
        template: activeTemplate
          ? {
              id: activeTemplate.id,
              name: activeTemplate.name,
              category: activeTemplate.category,
              schema: activeTemplate.schema,
            }
          : null,
      }
    : null;

  const backlinks = resolveBacklinks({
    active: activeMeta ? { id: activeMeta.id, title: activeMeta.title } : null,
    entries: rows.map((e) => ({
      id: e.id,
      title: e.title,
      contentHtml: e.contentHtml,
      type: e.type,
      data: e.data,
    })),
    templates,
    isGM,
  });

  return (
    // 3.75rem top bar (modules fusionnés) + ~0.5rem fil d'ariane.
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <nav className="flex items-center gap-2 text-xs text-muted" aria-label="Fil d'ariane">
          <Link href={`/campaign/${id}`} className="hover:text-accent">
            ← Campagne
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isGM && (
            <Link href={`/campaign/${id}/wiki/templates`} className="btn px-2 py-1 text-xs">
              Modèles
            </Link>
          )}
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {isGM ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
      </div>
      <WikiApp
        campaignId={id}
        entries={rows.map((e) => ({ id: e.id, title: e.title, folder: e.folder, type: e.type }))}
        active={active}
        templates={templates}
        backlinks={backlinks}
        isGM={isGM}
      />
    </div>
  );
}
