import Link from "next/link";
import { EyeIcon, EyeOffIcon, LayoutIcon } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { stripGmSecrets } from "@/lib/wiki";
import { redirectModuleToDesktop, requireCampaignPage } from "@/features/campaigns/require-member";
import { visibleEntityWhere } from "@/features/fiches/access";
import { resolveBacklinks } from "@/features/wiki/backlinks";
import { WikiApp } from "@/features/wiki/wiki-app";
import {
  collectLinkedNoteIds,
  linkedNote,
  linkedNoteVisuals,
  type LinkedNote,
} from "@/features/wiki/templates/linked-notes";
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
  searchParams: Promise<{ note?: string; embed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await redirectModuleToDesktop(id, "wiki", searchParams);
  const { member } = await requireCampaignPage(id, "wiki");
  const isGM = member.role === "GM";

  const [entities, rawTemplates] = await Promise.all([
    prisma.entity.findMany({
      // Une note MJ ou une fiche assignée à un autre joueur n'existe pas pour
      // un joueur : ni liste, ni accès par id.
      where: { campaignId: id, ...visibleEntityWhere(member.role, member.userId) },
      select: {
        id: true,
        title: true,
        folder: true,
        contentHtml: true,
        type: true,
        data: true,
        shareSlug: true,
        gmOnly: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.jsonTemplate.findMany({
      where: { campaignId: id },
      select: { id: true, name: true, category: true, schema: true, customCss: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const templates: WikiTemplateMeta[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    schema: t.schema,
    customCss: t.customCss,
  }));
  const templateById = new Map(rawTemplates.map((t) => [t.id, t]));
  const templateMetaById = new Map(templates.map((t) => [t.id, t]));

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
        gmOnly: activeMeta.gmOnly,
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
              customCss: activeTemplate.customCss,
            }
          : null,
      }
    : null;

  // Fiches référencées par les colonnes `tag` de la fiche active : résumés des cartes.
  const linkedIds = active
    ? collectLinkedNoteIds(active.template?.schema, active.data)
    : new Set<string>();
  const linked: Record<string, LinkedNote> = {};
  for (const noteId of linkedIds) {
    const entity = rows.find((e) => e.id === noteId);
    if (!entity) continue;
    const tpl = templateById.get(entity.type) ?? null;
    linked[noteId] = linkedNote(
      { title: entity.title, type: entity.type },
      tpl ? { id: tpl.id, name: tpl.name, category: tpl.category, schema: tpl.schema } : null,
      withoutBlocks(entity.data),
    );
  }

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
    // 3.75rem top bar (modules fusionnés) ; pas de fil d'ariane (refonte wiki).
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <span className="text-[0.65rem] tracking-[0.2em] text-muted uppercase">Wiki</span>
        <div className="flex items-center gap-2">
          {isGM && (
            <Link
              href={`/campaign/${id}/wiki/templates`}
              className="inline-flex h-8 items-center gap-1.5 border border-border bg-card px-2.5 text-xs transition hover:border-accent/60 hover:bg-card-hover"
            >
              <LayoutIcon />
              Modèles
            </Link>
          )}
          <span
            className={`inline-flex h-8 items-center gap-1.5 border px-2 text-[0.65rem] tracking-widest uppercase ${
              isGM
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-border bg-card text-muted"
            }`}
          >
            {isGM ? <EyeIcon /> : <EyeOffIcon />}
            {isGM ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
      </div>
      <WikiApp
        campaignId={id}
        entries={rows.map((e) => ({
          id: e.id,
          title: e.title,
          folder: e.folder,
          type: e.type,
          gmOnly: e.gmOnly,
          ...linkedNoteVisuals(templateMetaById.get(e.type) ?? null, withoutBlocks(e.data)),
        }))}
        active={active}
        templates={templates}
        linked={linked}
        backlinks={backlinks}
        isGM={isGM}
      />
    </div>
  );
}
