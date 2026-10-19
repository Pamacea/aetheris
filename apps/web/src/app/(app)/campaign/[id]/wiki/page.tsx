import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { noteBlocksSchema, type NoteBlock } from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WikiApp, type WikiTemplateMeta } from "./wiki-app";
import { resolveWikiView, type EntityRow } from "./wiki-view";

export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId: id } },
    select: { role: true },
  });
  if (!member) notFound();
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

  // L'entité « block-lib » (Bibliothèque de blocs) n'est pas une note :
  // retirée de toutes les listes (notes, graphe, backlinks, palette VTT).
  const libEntity = entities.find((e) => e.type === "block-lib") ?? null;
  const noteEntities: EntityRow[] = entities.filter((e) => e.type !== "block-lib");

  // Bibliothèque de blocs : GM → tout ; joueur → blocs non-gm (anti-fuite
  // côté serveur, miroir de visibleBlocks dans wiki-view).
  const libParsed = noteBlocksSchema.safeParse(
    (libEntity?.data as { blocks?: unknown } | null)?.blocks,
  );
  const blockLibrary: NoteBlock[] = !libParsed.success
    ? []
    : isGM
      ? libParsed.data
      : libParsed.data.filter((b) => !b.gm);

  const notes = noteEntities.map((e) => ({
    id: e.id,
    title: e.title,
    folder: e.folder,
    type: e.type,
  }));

  const activeMeta = noteEntities.find((e) => e.id === sp.note) ?? noteEntities[0] ?? null;
  const { active, backlinks, graph } = resolveWikiView({
    activeMeta,
    noteEntities,
    templateById,
    isGM,
  });

  return (
    <div className="flex h-[calc(100dvh-3.75rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link href={`/campaign/${id}`} className="hover:text-accent">
            ← {`Campagne`}
          </Link>
          <span>/</span>
          <span className="text-foreground">Lore Wiki</span>
        </nav>
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          {isGM ? "Mode MJ" : "Mode joueur"}
        </span>
      </div>
      <WikiApp
        campaignId={id}
        notes={notes}
        templates={templates}
        active={active}
        backlinks={backlinks}
        graph={graph}
        isGM={isGM}
        blockLibrary={blockLibrary}
      />
    </div>
  );
}
