import { CampaignTabs } from "./campaign-tabs";

/**
 * Layout de campagne : la barre de modules est persistante sur TOUTES les
 * pages de campagne (hub + pages module), pour éviter les allers-retours
 * par le hub. Le hub lui-même masque la barre (voir campaign-tabs.tsx) au
 * profit de sa grille de modules.
 * Slot `@modal` : navigation fluide par modale (routes d'interception) —
 * le clic sur un module ouvre la page dans une fenêtre par-dessus la page
 * courante ; l'URL directe / le refresh restent la page pleine.
 */
export default async function CampaignLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <CampaignTabs campaignId={id} />
      {children}
      {modal}
    </>
  );
}
