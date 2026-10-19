import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { PermissionsMembers } from "./permissions-members";

/**
 * Éditeur de permissions granulaires (Phase 10) — qui voit quoi, par membre.
 * Grants persistés sur `CampaignMember.permissions` (migration
 * phase10_permissions) : la case « voit » d'un plugin est éditable par le MJ,
 * le refus est relu dans `requireCampaignPlugin` (→ 404). Cœur (wiki/table/
 * chat) toujours actif, « modifie » toujours dérivé du rôle.
 */
export default async function PermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignMember(id);
  if (!member) notFound();
  const isGM = member.role === "GM";

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      title: true,
      enabledPlugins: true,
      members: {
        orderBy: [{ role: "asc" }, { id: "asc" }],
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="mx-auto flex w-full md:w-2/3 flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <nav className="text-xs text-muted">
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
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl tracking-wide">
            <span className="mark-tri" aria-hidden />
            Permissions
          </h1>
          <Link href={`/builder?c=${id}`} className="text-xs text-accent hover:underline">
            ← Builder
          </Link>
        </div>
        <p className="text-sm text-muted">
          Qui voit quoi : rôle par membre, accès par module. Le MJ lit et modifie tout ; le joueur
          consulte les modules activés.
        </p>
        {!isGM && (
          <p className="panel border-accent/40 px-4 py-3 text-xs text-accent">
            Lecture seule — la gestion des rôles est réservée aux MJ.
          </p>
        )}
      </header>

      <PermissionsMembers
        campaignId={id}
        enabledPlugins={campaign.enabledPlugins}
        isGM={isGM}
        members={campaign.members}
      />
    </div>
  );
}
