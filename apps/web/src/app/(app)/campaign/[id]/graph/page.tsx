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
  await requireCampaignPage(id, "graph");

  const [entities, links] = await Promise.all([
    prisma.entity.findMany({
      where: { campaignId: id },
      select: { id: true, title: true, type: true },
      orderBy: { title: "asc" },
    }),
    prisma.entityLink.findMany({
      where: { fromEntity: { campaignId: id } },
      select: { id: true, label: true, fromEntityId: true, toEntityId: true },
    }),
  ]);

  return (
    <div className="w-full overflow-y-auto px-6 pb-6 [scrollbar-gutter:stable]">
      <h1 style={{ marginBlock: "1.25rem 1rem", fontSize: "1.35rem" }}>
        <span className="mark-tri" aria-hidden />
        Graphe de relations
      </h1>
      <GraphClient campaignId={id} nodes={entities} links={links} />
    </div>
  );
}
