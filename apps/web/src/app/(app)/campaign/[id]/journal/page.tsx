import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { journalScope } from "@/features/journal/scope";
import { JournalApp } from "@/features/journal/journal-app";
import type { Handout } from "@aetheris/shared";

/**
 * Journal de bord : le MJ tient ses sessions (titre, contenu, image,
 * partage), les joueurs ne voient que les entrées partagées.
 * Lecture ici (server) ; les mutations vivent dans features/journal.
 */
export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // Plugin désactivé (Réglages) ou grant refusé → 404, comme les autres modules.
  const member = await requireCampaignPlugin(id, "journal");
  if (!member) notFound();
  const isGM = member.role === "GM";

  const rows = await prisma.journalEntry.findMany({
    where: journalScope(id, isGM),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      shared: true,
      createdAt: true,
    },
  });

  const entries: Handout[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    imageUrl: r.imageUrl,
    shared: r.shared,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="bar flex flex-1 flex-col gap-6 py-12">
      <nav className="text-xs text-muted" aria-label="Fil d'ariane">
        <Link href={`/campaign/${id}`} className="hover:text-accent">
          ← Campagne
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Journal de bord</span>
      </nav>

      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Journal de bord
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
            {isGM ? "MJ" : "Joueur"}
          </span>
          <span>
            {isGM
              ? "Tenez le fil des sessions — partagez un handout pour le rendre visible aux joueurs."
              : "Les entrées partagées par le MJ apparaissent ici."}
          </span>
        </p>
      </header>

      <JournalApp campaignId={id} isGM={isGM} entries={entries} />
    </div>
  );
}
