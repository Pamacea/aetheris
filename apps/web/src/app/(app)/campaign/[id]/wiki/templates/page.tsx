import Link from "next/link";
import { ChevronLeftIcon, EyeIcon, EyeOffIcon, LayoutIcon } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { redirectModuleToDesktop, requireCampaignPage } from "@/features/campaigns/require-member";
import { TemplatesBuilder } from "@/features/wiki/templates/builder";
import type { WikiTemplateMeta } from "@/features/wiki/types";

export default async function TemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "wiki", searchParams);
  const { embed } = await searchParams;
  // Garde le rendu dans l'iframe de la table quand on revient au wiki global.
  const wikiHref = `/campaign/${id}/wiki${embed === "1" ? "?embed=1" : ""}`;
  const { member } = await requireCampaignPage(id);
  const isGM = member.role === "GM";

  const raw = isGM
    ? await prisma.jsonTemplate.findMany({
        where: { campaignId: id },
        select: { id: true, name: true, category: true, schema: true },
        orderBy: { name: "asc" },
      })
    : [];
  const templates: WikiTemplateMeta[] = raw.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    schema: t.schema,
  }));

  return (
    // 3.75rem top bar (modules fusionnés) ; pas de fil d'ariane (refonte wiki).
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] tracking-[0.2em] text-muted uppercase">
          <LayoutIcon />
          Modèles
        </span>
        <div className="flex items-center gap-2">
          <Link href={wikiHref} className="btn h-8 px-2.5 py-0 text-[0.65rem]">
            <ChevronLeftIcon />
            Wiki
          </Link>
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
      {isGM ? (
        <TemplatesBuilder campaignId={id} initial={templates} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-10 text-center">
          <p className="text-sm text-muted">La gestion des modèles est réservée aux MJ.</p>
        </div>
      )}
    </div>
  );
}
