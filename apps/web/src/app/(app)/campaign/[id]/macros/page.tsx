import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requireCampaignPlugin } from "@/lib/campaign-server";
import { redirectModuleToDesktop } from "@/features/campaigns/require-member";
import { MacroEditor } from "@/features/macros/macro-editor";

/**
 * Module Constructeur de macros (plugin `macros`).
 * Garde : membre + plugin activé + grant de vue (sinon 404).
 * Éditeur + exécution sandbox, stockage localStorage par campagne ; la
 * commande produite part par la socket campagne vers le Chat de la table
 * (broadcast `chat:message` / `dice:rolled`).
 */
export default async function MacrosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "macros", searchParams);
  const session = await getSession();
  if (!session) redirect("/login");

  const member = await requireCampaignPlugin(id, "macros");
  if (!member) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-end gap-3 border-b border-border px-4 py-1.5">
        <span className="text-[0.65rem] tracking-widest text-muted uppercase">
          {member.role === "GM" ? "Mode MJ" : "Mode joueur"}
        </span>
      </div>

      <div className="no-scrollbar w-full px-6 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-8">
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
  );
}
