import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { redirectModuleToDesktop, requireCampaignPage } from "@/features/campaigns/require-member";
import { PermissionsMembers } from "@/features/permissions/members-list";

/**
 * Permissions de campagne — réservé aux MJ : rôle par membre (GM/PLAYER)
 * et visibilité par module pour chaque joueur. Les refus seuls sont
 * persistés sur `CampaignMember.permissions` = { view: { [module]: false } }
 * (logique : features/permissions, lecture : lib/canViewModule).
 */
export default async function PermissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "permissions", searchParams);
  const { member } = await requireCampaignPage(id);
  if (member.role !== "GM") redirect(`/campaign/${id}`);

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
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
    <div className="w-full px-6 flex flex-1 flex-col gap-8 py-12">
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
