import { requireCampaignPage } from "@/features/campaigns/require-member";
import { ChatPanel } from "@/features/vtt/chat-panel";
import { loadVttPageData } from "@/features/vtt/page-data";
import { VttApp } from "@/features/vtt/vtt-app";
import { TriPanel } from "@/components/tri-panel";
import { VttDesktop } from "@/components/campaigns/vtt-desktop";

export default async function VttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await requireCampaignPage(id, "vtt");
  const { messages, initialScene, members } = await loadVttPageData(id);
  const isGM = member.role === "GM";

  return (
    <VttDesktop campaignId={id}>
      <TriPanel rightPanel={<ChatPanel campaignId={id} initialMessages={messages} />}>
        <VttApp
          isGM={isGM}
          campaignId={id}
          userId={member.userId}
          members={members}
          initialScene={initialScene}
        />
      </TriPanel>
    </VttDesktop>
  );
}
