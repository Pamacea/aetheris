import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { PermissionsMembers } from "@/features/permissions/members-list";

/**
 * Permissions de campagne — réservé aux MJ : rôle par membre (GM/PLAYER)
 * et visibilité par module pour chaque joueur. Les refus seuls sont
 * persistés sur `CampaignMember.permissions` = { view: { [module]: false } }
 * (logique : features/permissions, lecture : lib/canViewModule).
 */
export default async function PermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await requireCampaignPage(id);
  if (member.role !== "GM") redirect(`/campaign/${id}`);

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      title: true,
      members: {
        orderBy: [{ role: "asc" }, { id: "asc" }],
        select: {
          id: true,
          role: true,
          permissions: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="bar flex flex-1 flex-col gap-8 py-12">
      <nav className="text-xs text-muted" aria-label="Fil d'ariane">
        <Link href="/dashboard" className="hover:text-accent">
          Campagnes
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/campaign/${id}`} className="hover:text-accent">
          {campaign.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Permissions</span>
      </nav>

      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Permissions
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
            MJ
          </span>
          <span>
            Qui voit quoi : rôle par membre, modules visibles par joueur — un module décoché devient
            invisible pour ce joueur.
          </span>
        </p>
      </header>

      <PermissionsMembers campaignId={id} members={campaign.members} />
    </div>
  );
}
