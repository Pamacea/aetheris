import { redirect } from "next/navigation";
import { requireCampaignPage } from "@/features/campaigns/require-member";

/**
 * La table de jeu est la vue unique de la campagne : plus de page hub.
 * Les liens historiques `/campaign/<id>` aboutissent donc sur le bureau VTT.
 */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCampaignPage(id);
  redirect(`/campaign/${encodeURIComponent(id)}/vtt`);
}
