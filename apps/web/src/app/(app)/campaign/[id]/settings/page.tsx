import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { redirectModuleToDesktop, requireCampaignPage } from "@/features/campaigns/require-member";
import { SettingsInfoForm } from "@/features/campaign-settings/settings-info-form";
import { ThemeEditor } from "@/features/campaign-settings/theme-editor";
import { PluginToggles } from "@/features/campaign-settings/plugin-toggles";
import { RegenerateCodeButton } from "@/features/campaign-settings/regenerate-code-button";
import { CopyCodeButton } from "../copy-code-button";

/**
 * Réglages de la campagne : infos (titre, couverture, logo, système de jeu),
 * modules (bascule des plugins du catalogue, MJ), éditeur de thème custom
 * (CSS sanitisé + JS bac à sable, MJ uniquement) et code d'invitation
 * régénérable (MJ). Toute écriture est revérifiée `role === "GM"` dans
 * features/campaign-settings/actions.ts.
 */
export default async function CampaignSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  await redirectModuleToDesktop(id, "settings", searchParams);
  const { member } = await requireCampaignPage(id);
  const isGM = member.role === "GM";

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      title: true,
      coverImage: true,
      logo: true,
      gameSystem: true,
      customStyles: true,
      customScript: true,
      inviteCode: true,
      enabledPlugins: true,
    },
  });
  if (!campaign) notFound();

  return (
    <div className="w-full px-6 flex flex-1 flex-col gap-6 py-12">
      <header>
        <h1 className="text-3xl tracking-wide">
          <span className="mark-tri" aria-hidden />
          Réglages
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
            {isGM ? "MJ" : "Joueur"}
          </span>
          <span>
            {isGM
              ? "Informations, modules, thème personnalisé et invitation."
              : "Informations de la campagne — lecture seule."}
          </span>
        </p>
      </header>

      <SettingsInfoForm
        campaignId={id}
        isGM={isGM}
        initial={{
          title: campaign.title,
          coverImage: campaign.coverImage,
          logo: campaign.logo,
          gameSystem: campaign.gameSystem,
        }}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-widest text-muted uppercase">Modules</h2>
        <PluginToggles campaignId={id} enabledPlugins={campaign.enabledPlugins} isGM={isGM} />
        <div className="flex flex-col gap-1 text-xs text-muted">
          <p>
            <span className="text-accent">Lore Wiki</span> — module core, toujours actif.
          </p>
          <p>Désactiver un module : sa page renvoie 404 pour tout le monde, joueurs compris.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-widest text-muted uppercase">Personnalisation</h2>
        {isGM ? (
          <ThemeEditor
            campaignId={id}
            initialCss={campaign.customStyles ?? ""}
            initialJs={campaign.customScript ?? ""}
          />
        ) : (
          <p className="panel px-4 py-6 text-center text-sm text-muted">
            Personnalisation du thème (CSS / JS) réservée aux MJ.
          </p>
        )}
      </section>

      {isGM && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <h2 className="text-xs tracking-widest text-muted uppercase">Code d&apos;invitation</h2>
            <code className="mt-2 block text-sm text-accent">{campaign.inviteCode}</code>
            <p className="mt-1 text-[0.7rem] text-muted">
              Régénérer invalide l&apos;ancien code immédiatement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyCodeButton code={campaign.inviteCode} />
            <RegenerateCodeButton campaignId={id} />
          </div>
        </section>
      )}
    </div>
  );
}
