import { prisma } from "@/lib/prisma";
import { redirectModuleToDesktop, requireCampaignPage } from "@/features/campaigns/require-member";
import { choiceSelect, toChoiceView, type ChoiceView } from "@/features/choices/choice-view";
import { ChoicesApp } from "@/features/choices/choices-app";

/**
 * Suivi des choix joueurs (style Amsel Tome) : le MJ lance des votes,
 * les joueurs tranchent, le temps réel pousse via la room campagne.
 * Lecture ici (server) ; les mutations vivent dans features/choices.
 */
export default async function ChoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "choices", searchParams);
  const { member } = await requireCampaignPage(id, "choices");
  const isGM = member.role === "GM";

  const rows = await prisma.playerChoice.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
    select: choiceSelect(isGM),
  });

  const choices: ChoiceView[] = [];
  for (const row of rows) {
    const view = toChoiceView(row, member.userId, isGM);
    if (!view) continue; // ligne corrompue : ignorée plutôt qu'affichée cassée
    choices.push(view);
  }

  return (
    <div className="w-full px-6 flex flex-1 flex-col gap-6 py-12">
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
