import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { FichesApp } from "@/features/fiches/fiches-app";
import { selectFiches } from "@/features/fiches/fiches";
import type { WikiEntryMeta, WikiTemplateMeta } from "@/features/wiki/types";

/**
 * Module Fiches joueurs (plugin `fiches`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Liste des entities dont le type référence un JsonTemplate de la campagne ;
 * édition = TemplateForm du wiki (autosave via saveTemplateData, garde membre).
 */
export default async function FichesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "fiches");
  if (!member) notFound();
  const isGM = member.role === "GM";

  const [rawTemplates, entities] = await Promise.all([
    prisma.jsonTemplate.findMany({
      where: { campaignId: id },
      select: { id: true, name: true, category: true, schema: true },
      orderBy: { name: "asc" },
    }),
    prisma.entity.findMany({
      where: { campaignId: id },
      select: { id: true, title: true, folder: true, type: true, data: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const templates: WikiTemplateMeta[] = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    schema: t.schema,
  }));
  const fiches = selectFiches(entities, templates);
  // L'entité legacy « block-lib » (bibliothèque de blocs) n'est pas une note.
  const notes: WikiEntryMeta[] = entities
    .filter((e) => e.type !== "block-lib")
    .map((e) => ({ id: e.id, title: e.title, folder: e.folder, type: e.type }));

  return (
    // 3.75rem top bar (modules fusionnés) + ~0.5rem fil d'ariane.
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-center gap-3 border-b border-border px-4 py-1.5">
        <nav
          className="flex flex-1 items-center gap-2 text-xs text-muted"
          aria-label="Fil d'ariane"
        >
          <Link href={`/campaign/${id}`} className="hover:text-accent">
            ← Campagne
          </Link>
          <span>/</span>
          <span className="text-foreground">Fiches joueurs</span>
        </nav>
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          {isGM ? "Mode MJ" : "Mode joueur"}
        </span>
      </div>
      <FichesApp campaignId={id} fiches={fiches} notes={notes} templates={templates} />
    </div>
  );
}
