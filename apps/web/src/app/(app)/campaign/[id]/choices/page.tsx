import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { parseOptions, tallyVotes } from "@/features/choices/vote-logic";
import { ChoicesApp, type ChoiceView } from "@/features/choices/choices-app";

/**
 * Suivi des choix joueurs (style Amsel Tome) : le MJ lance des votes,
 * les joueurs tranchent, le temps réel pousse via la room campagne.
 * Lecture ici (server) ; les mutations vivent dans features/choices.
 */
export default async function ChoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await requireCampaignPage(id, "choices");
  const isGM = member.role === "GM";

  const rows = await prisma.playerChoice.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prompt: true,
      options: true,
      status: true,
      resolvedOption: true,
      createdAt: true,
      votes: { select: { userId: true, optionIndex: true, comment: true } },
    },
  });

  const choices: ChoiceView[] = [];
  for (const row of rows) {
    const options = parseOptions(row.options);
    if (!options) continue; // ligne corrompue : ignorée plutôt qu'affichée cassée
    const mine = row.votes.find((v) => v.userId === member.userId);
    choices.push({
      id: row.id,
      prompt: row.prompt,
      options,
      status: row.status === "resolved" ? "resolved" : "open",
      resolvedOption: row.resolvedOption,
      createdAt: row.createdAt.toISOString(),
      counts: tallyVotes(row.votes, options.length),
      myVote: mine ? { optionIndex: mine.optionIndex, comment: mine.comment } : null,
      // Les commentaires des autres ne quittent pas le serveur pour un joueur.
      comments: isGM
        ? row.votes.flatMap((v) =>
            v.comment ? [{ optionIndex: v.optionIndex, comment: v.comment }] : [],
          )
        : [],
    });
  }

  return (
    <div className="bar flex flex-1 flex-col gap-6 py-12">
      <nav className="text-xs text-muted" aria-label="Fil d'ariane">
        <Link href={`/campaign/${id}`} className="hover:text-accent">
          ← Campagne
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Choix joueurs</span>
      </nav>

      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Choix joueurs
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
            {isGM ? "MJ" : "Joueur"}
          </span>
          <span>
            {isGM
              ? "Lancez une question, les votes arrivent en direct."
              : "Votez — un seul vote par choix, modifiable tant qu'il est ouvert."}
          </span>
        </p>
      </header>

      <ChoicesApp campaignId={id} isGM={isGM} choices={choices} />
    </div>
  );
}
