import { notFound, redirect } from "next/navigation";
import { combatStateSchema, EMPTY_COMBAT_STATE, type CombatState } from "@aetheris/shared";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { redirectModuleToDesktop } from "@/features/campaigns/require-member";
import { CombatApp } from "@/features/combat/combat-app";

/**
 * Module Combat & Initiative (plugin `combat`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Lecture ici (server) ; les mutations vivent dans features/combat.
 */
export default async function CombatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "combat", searchParams);
  const session = await getSession();
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "combat");
  if (!member) notFound();
  const isGM = member.role === "GM";

  const row = await prisma.campaignEncounter.findUnique({
    where: { campaignId: id },
    select: { state: true },
  });
  const parsed = combatStateSchema.safeParse(row?.state);
  const initial: CombatState = parsed.success ? parsed.data : EMPTY_COMBAT_STATE;

  return (
    <div className="no-scrollbar w-full px-6 flex min-h-0 flex-col gap-6 overflow-y-auto py-12">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Combat &amp; Initiative
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
            {isGM ? "MJ" : "Joueur"}
          </span>
          <span>
            {isGM
              ? "Ajoutez les combattants, jetez l'initiative, avancez les tours."
              : "Suivez l'initiative en direct — seuls les MJ pilotent le combat."}
          </span>
        </p>
      </header>

      <CombatApp campaignId={id} isGM={isGM} initialState={initial} />
    </div>
  );
}
