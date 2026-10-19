import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCampaignMember } from "@/lib/campaign-server";
import { TriPanel } from "@/components/tri-panel";
import { ThemeEditor } from "./theme-editor";

/**
 * Réglages de thème de la campagne (Phase 9) : éditeur CSS/JS custom,
 * presets, export/import JSON. L'accès est membre (lecture seule pour
 * les joueurs) ; l'écriture est verrouillée MJ dans `actions.ts`.
 */
export default async function CampaignSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const member = await requireCampaignMember(id);
  if (!member) notFound();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { title: true, customStyles: true, customScript: true },
  });
  if (!campaign) notFound();

  return (
    <TriPanel>
      <div className="mx-auto flex w-full flex-1 flex-col gap-6 px-6 py-10 md:w-2/3">
        <header className="flex flex-col gap-3">
          <nav className="flex items-center gap-2 text-xs text-muted">
            <Link href={`/campaign/${id}`} className="hover:text-accent">
              ← Campagne
            </Link>
            <span>/</span>
            <span className="text-foreground">{campaign.title}</span>
            <span>/</span>
            <span className="text-foreground">Thèmes</span>
          </nav>
          <h1 className="text-2xl tracking-wide">Thèmes &amp; Personnalisation</h1>
          <p className="text-sm text-muted">
            CSS et JavaScript personnalisés pour cette campagne. Le CSS est appliqué à toutes les
            pages de la campagne après sanitisation ; le JS ne s&apos;exécute jamais dans la page —
            uniquement dans l&apos;aperçu sandboxé ci-dessous (iframe sans origine).
          </p>
        </header>

        <ThemeEditor
          campaignId={id}
          initialCss={campaign.customStyles ?? ""}
          initialJs={campaign.customScript ?? ""}
          isGM={member.role === "GM"}
        />
      </div>
    </TriPanel>
  );
}
