import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { TriPanel } from "@/components/tri-panel";
import { MacroEditor } from "../../../builder/macro-editor";

/**
 * Module Constructeur de macros (plugin `macros`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Réutilise l'éditeur de `/builder` (sandbox iframe + chat), stockage
 * localStorage par campagne.
 */
export default async function MacrosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "macros");
  if (!member) notFound();

  return (
    <TriPanel>
      <div className="flex h-[calc(100dvh-3.75rem)] min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1.5">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">Constructeur de macros</span>
          </nav>
          <span className="text-[0.65rem] tracking-widest text-muted uppercase">
            {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
          </span>
        </div>
        <div className="mx-auto flex w-full flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
          <p className="text-xs text-muted">
            Corps JS exécuté en sandbox (iframe sans origine partagée) — la macro retourne une
            commande envoyée au chat, ex. <code className="text-foreground">/roll 1d20</code>.
          </p>
          <MacroEditor campaignId={id} />
        </div>
      </div>
    </TriPanel>
  );
}
