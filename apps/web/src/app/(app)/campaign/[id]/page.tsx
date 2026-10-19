import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { GAME_SYSTEMS, NATIVE_THEMES, PLUGIN_CATALOG } from "@aetheris/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewModule } from "@/lib/grants";
import { TriPanel } from "@/components/tri-panel";
import { ArchiveButtons } from "../../builder/archive-buttons";
import { PluginToggles } from "./plugin-toggles";
import { CampaignHeader } from "./campaign-header";
import { CampaignMembers } from "./campaign-members";
import { CampaignModules } from "./campaign-modules";

export default async function CampaignHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  const membership = campaign?.members.find((m) => m.userId === session.user.id);
  if (!campaign || !membership) notFound();

  const theme = NATIVE_THEMES.find((t) => t.id === campaign.theme)?.name ?? "Custom";

  let gameSystemLabel: string | undefined = GAME_SYSTEMS.find(
    (s) => s.id === campaign.gameSystem,
  )?.name;
  if (!gameSystemLabel && campaign.gameSystem !== "custom") {
    const custom = await prisma.gameSystem.findUnique({
      where: { id: campaign.gameSystem },
      select: { name: true },
    });
    gameSystemLabel = custom?.name;
  }
  gameSystemLabel ??= "Custom";

  const isGM = membership.role === "GM";

  return (
    <TriPanel>
      <div className="mx-auto flex w-full md:w-2/3 flex-1 flex-col gap-8 px-6 py-12">
        <CampaignHeader
          id={id}
          campaign={campaign}
          theme={theme}
          gameSystemLabel={gameSystemLabel}
          isGM={isGM}
        />
        <CampaignModules
          id={id}
          enabledPlugins={campaign.enabledPlugins}
          permissions={membership.permissions}
          role={membership.role}
          isGM={isGM}
        />

        <section id="modules-etendus" className="flex flex-col gap-4">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Modules étendus (
            {PLUGIN_CATALOG.filter((p) => campaign.enabledPlugins.includes(p.id)).length}/
            {PLUGIN_CATALOG.length})
          </h2>
          <p className="text-xs text-muted">
            {isGM
              ? "Activez les modules dont votre campagne a besoin — le cœur (wiki, table, chat) reste toujours là."
              : "Modules activés par le MJ pour cette campagne."}
          </p>
          <PluginToggles
            campaignId={id}
            enabledPlugins={campaign.enabledPlugins}
            isGM={isGM}
            hiddenPlugins={PLUGIN_CATALOG.filter(
              (p) => !canViewModule(membership.permissions, p.id, membership.role),
            ).map((p) => p.id)}
          />
        </section>

        <CampaignMembers members={campaign.members} isGM={isGM} inviteCode={campaign.inviteCode} />

        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-medium tracking-[0.25em] text-muted uppercase">
            <span className="mark-tri" aria-hidden />
            Archive
          </h2>
          <ArchiveButtons campaignId={id} />
        </section>
      </div>
    </TriPanel>
  );
}
