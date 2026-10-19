import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateCampaignButton } from "./create-campaign-dialog";
import { CreateGameSystemButton } from "./create-game-system-dialog";
import { JoinCampaignForm } from "./join-campaign-form";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      members: { select: { role: true, userId: true } },
    },
  });

  const gameSystems = await prisma.gameSystem.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true },
  });

  return (
    <div className="mx-auto flex w-full md:w-2/3 flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
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
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Mes campagnes
          </h2>
          <CreateCampaignButton customSystems={gameSystems} />
        </div>

        {campaigns.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-muted">
            Aucune campagne pour l&apos;instant. Créez la première&nbsp;!
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {campaigns.map((c) => {
              const role = c.members.find((m) => m.userId === session.user.id)?.role;
              return (
                <li key={c.id}>
                  <Link
                    href={`/campaign/${c.id}`}
                    className="panel block p-4 transition hover:bg-card-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.title}</span>
                      <span className="border border-border px-2 py-0.5 text-[0.65rem] tracking-widest text-muted uppercase">
                        {role === "GM" ? "MJ" : "Joueur"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Créée le {c.createdAt.toLocaleDateString("fr-FR")}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Mes systèmes de jeu
          </h2>
          <CreateGameSystemButton />
        </div>

        {gameSystems.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-muted">
            Aucun système de jeu. Créez-en un pour vos feuilles, objets et cartes&nbsp;!
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {gameSystems.map((s) => (
              <li key={s.id} className="panel p-4">
                <span className="font-medium">{s.name}</span>
                <p className="mt-1 text-xs text-muted">{s.description ?? "Système personnalisé"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
