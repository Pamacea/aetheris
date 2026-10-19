import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { combatStateSchema, EMPTY_COMBAT_STATE, type CombatState } from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { TriPanel } from "@/components/tri-panel";
import { CombatApp } from "./combat-app";

/**
 * Module Combat & Initiative (plugin `combat`).
 * Garde : membre + plugin activé pour la campagne (sinon 404).
 */
export default async function CombatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "combat");
  if (!member) notFound();

  const row = await prisma.campaignEncounter.findUnique({
    where: { campaignId: id },
    select: { state: true },
  });
  const parsed = combatStateSchema.safeParse(row?.state);
  const initial: CombatState = parsed.success ? parsed.data : EMPTY_COMBAT_STATE;

  return (
    <TriPanel>
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Combat &amp; Initiative</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <CombatApp campaignId={id} isGM={member.role === "GM"} initialState={initial} />
      </div>
    </TriPanel>
  );
}
