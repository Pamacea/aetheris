import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateGameSystemButton } from "../dashboard/create-game-system-dialog";
import { PluginToggles } from "../campaign/[id]/plugin-toggles";
import { CampaignPicker } from "./campaign-picker";
import { GameSystems } from "./game-systems";
import { MacroEditor } from "./macro-editor";

/**
 * Builder — atelier de configuration (Phase 10) :
 * systèmes de règles (CRUD), plugins par campagne, macros sandboxées.
 * Les permissions granulaires ont leur propre route
 * `/campaign/[id]/permissions`.
 */
export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [gameSystems, campaigns] = await Promise.all([
    prisma.gameSystem.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.campaign.findMany({
      where: { members: { some: { userId: session.user.id } } },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        enabledPlugins: true,
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    }),
  ]);

  const selected = c !== undefined ? campaigns.find((camp) => camp.id === c) : undefined;
  const isGM = selected?.members[0]?.role === "GM";

  return (
    <div className="mx-auto flex w-full md:w-2/3 flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl tracking-wide">
            <span className="mark-tri" aria-hidden />
            Builder
          </h1>
          <p className="mt-1 text-sm text-muted">
            Atelier : systèmes de règles, modules par campagne, macros.
          </p>
        </div>
        <CampaignPicker
          campaigns={campaigns.map((camp) => ({
            id: camp.id,
            title: camp.title,
          }))}
          selectedId={selected?.id}
        />
        {c !== undefined && !selected && (
          <p className="panel border-destructive/60 px-4 py-3 text-xs text-destructive">
            Campagne introuvable ou accès refusé.
          </p>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Systèmes de règles
          </h2>
          <CreateGameSystemButton />
        </div>
        <p className="text-xs text-muted">
          Vos feuilles, objets et cartes — sélectionnables à la création d&apos;une campagne.
        </p>
        <GameSystems systems={gameSystems} />
      </section>

      {selected ? (
        <>
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
                <span className="mark-tri" aria-hidden />
                Modules de « {selected.title} »
              </h2>
              <div className="flex gap-2 text-xs">
                <Link href={`/campaign/${selected.id}`} className="text-accent hover:underline">
                  Hub campagne →
                </Link>
                <Link
                  href={`/campaign/${selected.id}/permissions`}
                  className="text-accent hover:underline"
                >
                  Permissions →
                </Link>
              </div>
            </div>
            <PluginToggles
              campaignId={selected.id}
              enabledPlugins={selected.enabledPlugins}
              isGM={isGM}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
              <span className="mark-tri" aria-hidden />
              Macros
            </h2>
            <p className="text-xs text-muted">
              Corps JS exécuté en sandbox (iframe sans origine partagée) — la macro retourne une
              commande, ex.{" "}
              <code className="border border-border px-1 text-foreground">
                /roll 1d20 + @force
              </code>{" "}
              , envoyée au chat de la campagne.
            </p>
            <MacroEditor key={selected.id} campaignId={selected.id} />
          </section>
        </>
      ) : (
        <p className="panel px-4 py-8 text-center text-sm text-muted">
          Choisissez une campagne ci-dessus pour gérer ses modules et ses macros.
        </p>
      )}
    </div>
  );
}
