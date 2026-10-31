import { prisma } from "@/lib/prisma";
import { redirectModuleToDesktop, requireCampaignPage } from "@/features/campaigns/require-member";
import { GraphClient } from "@/features/graph/GraphClient";

export default async function GraphPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "graph", searchParams);
  const { member } = await requireCampaignPage(id, "graph");
  const isGM = member.role === "GM";

  const [entities, links] = await Promise.all([
    prisma.entity.findMany({
      // Une note MJ n'apparaît pas dans le graphe d'un joueur.
      where: { campaignId: id, ...(isGM ? {} : { gmOnly: false }) },
      select: { id: true, title: true, type: true },
      orderBy: { title: "asc" },
    }),
    prisma.entityLink.findMany({
      // Un lien dont une extrémité est une note MJ fuiterait son libellé.
      where: {
        fromEntity: { campaignId: id, ...(isGM ? {} : { gmOnly: false }) },
        toEntity: { campaignId: id, ...(isGM ? {} : { gmOnly: false }) },
      },
      select: { id: true, label: true, fromEntityId: true, toEntityId: true },
    }),
  ]);

  return (
    <div className="no-scrollbar w-full overflow-y-auto px-6 pb-6">
      <h1 style={{ marginBlock: "1.25rem 1rem", fontSize: "1.35rem" }}>
        <span className="mark-tri" aria-hidden />
        Graphe de relations
      </h1>
      <GraphClient campaignId={id} nodes={entities} links={links} isGM={isGM} />
    </div>
  );
}
