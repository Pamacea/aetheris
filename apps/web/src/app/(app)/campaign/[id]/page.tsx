import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { CopyCodeButton } from "./copy-code-button";

/** Toolbar du hub : une carte = un module, titre + une ligne de description. */
const MODULES = [
  { slug: "vtt", title: "Table de jeu", desc: "Scène, jetons et grille pour jouer en ligne." },
  { slug: "wiki", title: "Wiki", desc: "Chroniques, lieux et personnages du monde." },
  { slug: "graph", title: "Graphe de relations", desc: "Visualisez les liens entre les entités." },
  { slug: "journal", title: "Journal", desc: "Notes et captures du MJ pour raconter la session." },
  { slug: "choices", title: "Choix", desc: "Sondages pour trancher une décision en groupe." },
  { slug: "ambiance", title: "Ambiance", desc: "Playlists et pistes sonores de la scène." },
  { slug: "combat", title: "Combat & Initiative", desc: "Tours, initiative et jetons de combat." },
  { slug: "fiches", title: "Fiches joueurs", desc: "Personnages, PV et gabarits de fiche." },
  { slug: "macros", title: "Macros", desc: "Raccourcis exécutés en sandbox et envoyés au chat." },
  { slug: "settings", title: "Réglages", desc: "Infos, modules, thème et code d'invitation." },
  { slug: "permissions", title: "Permissions", desc: "Rôles et droits de chaque membre." },
] as const;

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

      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-widest text-muted uppercase">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <Link
              key={mod.slug}
              href={`/campaign/${id}/${mod.slug}`}
              className="panel group flex flex-col gap-1 p-4 transition hover:bg-card-hover"
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold tracking-wide">
                {mod.title}
                <span
                  aria-hidden
                  className="text-accent opacity-0 transition-opacity group-hover:opacity-100"
                >
                  →
                </span>
              </span>
              <span className="text-xs text-muted">{mod.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
