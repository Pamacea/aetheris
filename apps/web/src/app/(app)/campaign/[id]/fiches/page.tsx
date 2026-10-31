import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { redirectModuleToDesktop } from "@/features/campaigns/require-member";
import { FichesApp } from "@/features/fiches/fiches-app";
import { selectFiches } from "@/features/fiches/fiches";
import { visibleEntityWhere } from "@/features/fiches/access";
import { linkedNoteVisuals } from "@/features/wiki/templates/linked-notes";
import type { WikiEntryMeta, WikiTemplateMeta } from "@/features/wiki/types";

/**
 * Module Fiches joueurs (plugin `fiches`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Liste des entities dont le type référence un JsonTemplate de la campagne ;
 * édition = TemplateForm du wiki (autosave via saveTemplateData, garde membre).
 */
export default async function FichesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "fiches", searchParams);
  const session = await getSession();
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "fiches");
  if (!member) notFound();
  const isGM = member.role === "GM";

  const [rawTemplates, entities] = await Promise.all([
    prisma.jsonTemplate.findMany({
      where: { campaignId: id },
      select: { id: true, name: true, category: true, schema: true, customCss: true },
      orderBy: { name: "asc" },
    }),
    prisma.entity.findMany({
      // Joueur : fiches non-MJ sans assigné (lecture seule) ou à lui.
      where: { campaignId: id, ...visibleEntityWhere(member.role, member.userId) },
      select: {
        id: true,
        title: true,
        folder: true,
        type: true,
        data: true,
        gmOnly: true,
        assignees: { select: { userId: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  // Sélecteur d'assignation : réservé au MJ.
  const members = isGM
    ? await prisma.campaignMember.findMany({
        where: { campaignId: id },
        select: { userId: true, user: { select: { name: true } } },
        orderBy: [{ role: "asc" }, { id: "asc" }],
      })
    : [];

  const templates: WikiTemplateMeta[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    schema: t.schema,
    customCss: t.customCss,
  }));
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const fiches = selectFiches(entities, templates);
  // L'entité legacy « block-lib » (bibliothèque de blocs) n'est pas une note.
  const notes: WikiEntryMeta[] = entities
    .filter((e) => e.type !== "block-lib")
    .map((e) => ({
      id: e.id,
      title: e.title,
      folder: e.folder,
      type: e.type,
      gmOnly: e.gmOnly,
      ...linkedNoteVisuals(
        templateById.get(e.type) ?? null,
        (e.data ?? {}) as Record<string, unknown>,
      ),
    }));

  return (
    // 3.75rem top bar (modules fusionnés) + ~0.5rem fil d'ariane.
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-end gap-3 border-b border-border px-4 py-1.5">
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          {isGM ? "Mode MJ" : "Mode joueur"}
        </span>
      </div>
      <FichesApp
        campaignId={id}
        fiches={fiches}
        notes={notes}
        templates={templates}
        isGM={isGM}
        viewerId={member.userId}
        members={members.map((m) => ({ userId: m.userId, name: m.user.name }))}
      />
    </div>
  );
}
