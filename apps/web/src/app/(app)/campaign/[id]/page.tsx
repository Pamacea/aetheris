import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { CampaignTabs } from "./campaign-tabs";
import { CopyCodeButton } from "./copy-code-button";

export default async function CampaignHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await requireCampaignPage(id);
  const isGM = member.role === "GM";

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { title: true, inviteCode: true, createdAt: true },
  });
  if (!campaign) notFound();

  return (
    <div className="bar flex flex-1 flex-col gap-8 py-12">
      <nav className="text-xs text-muted" aria-label="Fil d'ariane">
        <Link href="/dashboard" className="hover:text-accent">
          Campagnes
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{campaign.title}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-wide">
            <span className="mark-tri" aria-hidden />
            {campaign.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
              {isGM ? "MJ" : "Joueur"}
            </span>
            <span>Créée le {campaign.createdAt.toLocaleDateString("fr-FR")}</span>
          </p>
        </div>

        {isGM && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="tracking-widest text-muted uppercase">Code invite</span>
            <code className="border border-accent/60 px-2 py-0.5 text-accent">
              {campaign.inviteCode}
            </code>
            <CopyCodeButton code={campaign.inviteCode} />
          </div>
        )}
      </header>

      <CampaignTabs campaignId={id} />
    </div>
  );
}
