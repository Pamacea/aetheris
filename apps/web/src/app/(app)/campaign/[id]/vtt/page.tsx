import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { TriPanel } from "@/components/tri-panel";
import { VttApp } from "./vtt-app";
import { NotesPalette } from "./notes-palette";
import { ChatPanel } from "./chat-panel";
import { loadVttPageData } from "./vtt-page-data";

export default async function VttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { member, entities, paletteNotes, pnjTemplateId, messages, initialScene, modals } =
    await loadVttPageData(id, session.user.id);

  return (
    <TriPanel
      leftPanel={
        <NotesPalette
          campaignId={id}
          notes={paletteNotes}
          isGM={member.role === "GM"}
          pnjTemplateId={pnjTemplateId}
        />
      }
      rightPanel={<ChatPanel campaignId={id} initialMessages={messages} />}
    >
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Table de jeu</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <VttApp
          isGM={member.role === "GM"}
          campaignId={id}
          initialScene={initialScene}
          notes={entities}
          modals={modals}
        />
      </div>
    </TriPanel>
  );
}
