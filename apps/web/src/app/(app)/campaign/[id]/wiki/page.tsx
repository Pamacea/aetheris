import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { stripGmSecrets } from "@/lib/wiki";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { WikiApp } from "@/features/wiki/wiki-app";

export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { member } = await requireCampaignPage(id);
  const isGM = member.role === "GM";

  const entities = await prisma.entity.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      title: true,
      folder: true,
      contentHtml: true,
      type: true,
      shareSlug: true,
    },
    orderBy: { title: "asc" },
  });

  // L'entité legacy « block-lib » (bibliothèque de blocs) n'est pas une note.
  const rows = entities.filter((e) => e.type !== "block-lib");
  const activeMeta = rows.find((e) => e.id === sp.note) ?? rows[0] ?? null;

  const active = activeMeta
    ? {
        id: activeMeta.id,
        title: activeMeta.title,
        folder: activeMeta.folder,
        // Joueur : secrets MJ stripés côté serveur — jamais dans les props.
        contentHtml:
          (isGM ? activeMeta.contentHtml : stripGmSecrets(activeMeta.contentHtml)) || "<p></p>",
        shareSlug: isGM ? activeMeta.shareSlug : null,
      }
    : null;

  return (
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <nav className="flex items-center gap-2 text-xs text-muted" aria-label="Fil d'ariane">
          <Link href={`/campaign/${id}`} className="hover:text-accent">
            ← Campagne
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
        entries={rows.map((e) => ({ id: e.id, title: e.title, folder: e.folder }))}
        active={active}
        isGM={isGM}
      />
    </div>
  );
}
