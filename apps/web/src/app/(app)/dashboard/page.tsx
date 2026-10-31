import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteCodeChip } from "@/components/campaigns/invite-code-chip";
import { StatusBadge } from "../novels/status-badge";
import { CreateCampaignForm, JoinCampaignForm } from "./forms";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      inviteCode: true,
      createdAt: true,
      members: { select: { role: true, userId: true } },
    },
  });

  const novels = await prisma.novel.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      chapters: { select: { wordCount: true } },
    },
  });

  const novelCount = await prisma.novel.count({ where: { authorId: session.user.id } });

  return (
    <div className="mx-auto w-full px-6 lg:w-3/4 flex flex-1 flex-col gap-10 py-12">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Tableau de bord
        </h1>
        <p className="text-sm text-muted">
          Bonjour {session.user.name} — {campaigns.length} campagne
          {campaigns.length > 1 ? "s" : ""} — {novelCount} roman
          {novelCount > 1 ? "s" : ""}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Mes campagnes
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <JoinCampaignForm />
            <CreateCampaignForm />
          </div>
        </div>

        {campaigns.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-muted">
            Aucune campagne pour l&apos;instant. Créez la première&nbsp;!
          </p>
        ) : (
          <ul className="panel divide-y divide-border">
            {campaigns.map((c) => {
              const role = c.members.find((m) => m.userId === session.user.id)?.role;
              const isGM = role === "GM";
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 first:pt-4 last:pb-4"
                >
                  <Link href={`/campaign/${c.id}`} className="group min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-accent">
                      {c.title}
                    </span>
                    <span className="text-xs text-muted">
                      Créée le {c.createdAt.toLocaleDateString("fr-FR")}
                    </span>
                  </Link>
                  <span className="border border-border px-2 py-0.5 text-[0.65rem] tracking-widest text-muted uppercase">
                    {isGM ? "MJ" : "Joueur"}
                  </span>
                  {isGM && <InviteCodeChip code={c.inviteCode} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Mes romans
          </h2>
          <Link href="/novels" className="text-xs text-muted hover:text-foreground">
            Ouvrir le studio →
          </Link>
        </div>

        {novels.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-muted">
            Aucun roman pour l’instant.{" "}
            <Link href="/novels" className="text-foreground underline underline-offset-4">
              Ouvrir le studio →
            </Link>
          </p>
        ) : (
          <ul className="panel divide-y divide-border">
            {novels.map((n) => {
              const words = n.chapters.reduce((s, c) => s + c.wordCount, 0);
              return (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 first:pt-4 last:pb-4"
                >
                  <Link href={`/novels/${n.id}`} className="group min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-accent">
                      {n.title}
                    </span>
                    <span className="text-xs text-muted">
                      {n.chapters.length} chapitre{n.chapters.length > 1 ? "s" : ""} ·{" "}
                      {words.toLocaleString("fr-FR")} mots
                    </span>
                  </Link>
                  <StatusBadge status={n.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
