import Link from "next/link";

export function CampaignHeader({
  id,
  campaign,
  theme,
  gameSystemLabel,
  isGM,
}: {
  id: string;
  campaign: { title: string; logo: string | null; coverImage: string | null; createdAt: Date };
  theme: string;
  gameSystemLabel: string;
  isGM: boolean;
}) {
  return (
    <header className="flex flex-col gap-4">
      <nav className="text-xs text-muted">
        <Link href="/dashboard" className="hover:text-accent">
          Campagnes
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{campaign.title}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {isGM && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/campaign/${id}/settings`}
                className="border border-border px-2 py-0.5 tracking-widest uppercase hover:bg-card-hover"
              >
                Réglages
              </Link>
              <Link
                href={`/campaign/${id}/permissions`}
                className="border border-border px-2 py-0.5 tracking-widest uppercase hover:bg-card-hover"
              >
                Permissions
              </Link>
            </div>
          )}
          {campaign.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaign.logo} alt="" className="panel h-14 w-14 object-cover" />
          ) : (
            <span
              aria-hidden
              className="panel flex h-14 w-14 items-center justify-center text-xl text-accent"
            >
              <span className="mark-tri" />
            </span>
          )}
          <div>
            <h1 className="text-3xl tracking-wide">{campaign.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="border border-border px-2 py-0.5 tracking-widest uppercase">
                {theme}
              </span>
              <span className="border border-border px-2 py-0.5 tracking-widest uppercase">
                {gameSystemLabel}
              </span>
              <span className="border border-accent/60 px-2 py-0.5 tracking-widest text-accent uppercase">
                {isGM ? "MJ" : "Joueur"}
              </span>
              <span>Créée le {campaign.createdAt.toLocaleDateString("fr-FR")}</span>
            </p>
          </div>
        </div>
      </div>

      {campaign.coverImage && (
        <div className="panel h-40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.coverImage}
            alt={`Couverture de ${campaign.title}`}
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </header>
  );
}
