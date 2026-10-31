import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requireCampaignMember } from "@/lib/campaign-server";
import { canViewModule } from "@/lib/grants";

export type CampaignMember = NonNullable<Awaited<ReturnType<typeof requireCampaignMember>>>;

/**
 * Garde commune des pages de campagne : non connecté → /login,
 * connecté mais non membre → 404 (jamais de page « en construction »
 * exposée hors campagne). `module` = id de permissions (refus view:false → 404).
 */
export async function requireCampaignPage(
  campaignId: string,
  module?: string,
): Promise<{ member: CampaignMember }> {
  const member = await requireCampaignMember(campaignId);
  if (member) {
    if (module && !canViewModule(member.permissions, module, member.role)) notFound();
    return { member };
  }
  const session = await getSession();
  if (!session) redirect("/login");
  notFound();
}

/**
 * Un module ouvert hors du bureau (lien direct) redirige vers la table,
 * qui ouvrira sa fenêtre. `embed=1` = rendu dans l'iframe d'une fenêtre.
 */
export async function redirectModuleToDesktop(
  campaignId: string,
  slug: string,
  searchParams: Promise<{ embed?: string }>,
): Promise<void> {
  const { embed } = await searchParams;
  if (embed === "1") return;
  redirect(`/campaign/${campaignId}/vtt?open=${slug}`);
}
