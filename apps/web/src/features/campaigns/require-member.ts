import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  notFound();
}
