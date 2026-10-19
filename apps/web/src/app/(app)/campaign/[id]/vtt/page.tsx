import Link from "next/link";
import { requireCampaignPage } from "@/features/campaigns/require-member";
import { ChatPanel } from "@/features/vtt/chat-panel";
import { loadVttPageData } from "@/features/vtt/page-data";
import { VttApp } from "@/features/vtt/vtt-app";
import { TriPanel } from "@/components/tri-panel";

export default async function VttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await requireCampaignPage(id, "vtt");
  const { messages, initialScene, members } = await loadVttPageData(id);
  const isGM = member.role === "GM";

  return (
    <TriPanel rightPanel={<ChatPanel campaignId={id} initialMessages={messages} />}>
      <div className="flex h-[calc(100dvh-3.75rem-2.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted" aria-label="Fil d'ariane">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Table de jeu</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {isGM ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <VttApp
          isGM={isGM}
          campaignId={id}
          userId={member.userId}
          members={members}
          initialScene={initialScene}
        />
      </div>
    </TriPanel>
  );
}
