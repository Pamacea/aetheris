import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { TemplatesBuilder } from "@/features/wiki/templates/builder";
import type { WikiTemplateMeta } from "@/features/wiki/types";

export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    // 3.75rem top bar (modules fusionnés) + ~0.5rem fil d'ariane.
    <div className="flex h-[calc(100dvh-4.25rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
        <nav className="flex items-center gap-2 text-xs text-muted" aria-label="Fil d'ariane">
          <Link href={`/campaign/${id}`} className="hover:text-accent">
            ← Campagne
          </Link>
          <span>/</span>
          <Link href={`/campaign/${id}/wiki`} className="hover:text-accent">
            Lore Wiki
          </Link>
          <span>/</span>
          <span className="text-foreground">Modèles</span>
        </nav>
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          {isGM ? "Mode MJ" : "Mode joueur"}
        </span>
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
