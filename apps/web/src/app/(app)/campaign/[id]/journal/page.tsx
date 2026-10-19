import { ModuleStub } from "../module-stub";
import { requireCampaignPage } from "@/features/campaigns/require-member";

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCampaignPage(id);

  return <ModuleStub title="Journal" />;
}
