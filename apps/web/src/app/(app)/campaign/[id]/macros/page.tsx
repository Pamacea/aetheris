import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { ChatPanel } from "@/features/vtt/chat-panel";
import { loadVttPageData } from "@/features/vtt/page-data";
import { MacroEditor } from "@/features/macros/macro-editor";
import { TriPanel } from "@/components/tri-panel";

/**
 * Module Constructeur de macros (plugin `macros`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Éditeur + exécution sandbox, stockage localStorage par campagne ; la
 * commande produite part par la socket campagne et remonte dans le Chat
 * monté dans le panneau droit (broadcast `chat:message` / `dice:rolled`).
 */
export default async function MacrosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "macros");
  if (!member) notFound();

  const { messages } = await loadVttPageData(id);

  return (
    <TriPanel rightPanel={<ChatPanel campaignId={id} initialMessages={messages} />}>
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted" aria-label="Fil d'ariane">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>

        <div className="w-full px-6 flex flex-1 flex-col gap-4 overflow-y-auto py-8">
          <header>
            <h1 className="text-3xl tracking-wide">
              <span className="mark-tri" aria-hidden />
              Constructeur de macros
            </h1>
            <p className="mt-2 text-xs text-muted">
              Corps JS exécuté en sandbox (iframe sans origine partagée) — la macro retourne une
              commande envoyée au chat, ex. <code className="text-foreground">/roll 1d20</code>.
            </p>
          </header>
          <MacroEditor campaignId={id} />
        </div>
      </div>
    </TriPanel>
  );
}
