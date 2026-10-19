import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateCampaignForm, JoinCampaignForm } from "./forms";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
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

  return (
    <div className="bar flex flex-1 flex-col gap-10 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-wide">
            <span className="mark-tri" aria-hidden />
            Tableau de bord
          </h1>
          <p className="text-sm text-muted">
            Bonjour {session.user.name} — {campaigns.length} campagne
            {campaigns.length > 1 ? "s" : ""}
          </p>
        </div>
        <JoinCampaignForm />
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Mes campagnes
          </h2>
          <CreateCampaignForm />
        </div>

        {campaigns.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-muted">
            Aucune campagne pour l&apos;instant. Créez la première&nbsp;!
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((c) => {
              const role = c.members.find((m) => m.userId === session.user.id)?.role;
              const isGM = role === "GM";
              return (
                <li key={c.id}>
                  <Link
                    href={`/campaign/${c.id}`}
                    className="panel block p-4 transition hover:bg-card-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.title}</span>
                      <span className="border border-border px-2 py-0.5 text-[0.65rem] tracking-widest text-muted uppercase">
                        {isGM ? "MJ" : "Joueur"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Créée le {c.createdAt.toLocaleDateString("fr-FR")}
                    </p>
                    {isGM && (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="tracking-widest uppercase">Code invite</span>
                        <code className="border border-accent/60 px-2 py-0.5 text-accent">
                          {c.inviteCode}
                        </code>
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
          <span className="mark-tri" aria-hidden />
          Mes romans
        </h2>
        <Link href="/novels" className="panel block p-4 transition hover:bg-card-hover">
          <span className="font-medium">Studio d&apos;écriture</span>
          <p className="mt-1 text-xs text-muted">
            Romans, chapitres, publication — bientôt disponible. Ouvrir le studio →
          </p>
        </Link>
      </section>
    </div>
  );
}
