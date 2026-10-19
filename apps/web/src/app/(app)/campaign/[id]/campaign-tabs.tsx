"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Barre d'onglets persistante des pages module (rendue par layout.tsx).
 * Hauteur fixe `h-11` (2.75rem) : les pages plein écran (VTT, Macros) en
 * tiennent compte dans leur `calc(100dvh - 3.75rem - 2.75rem)`.
 * Masquée sur le hub : la grille de modules du hub en tient lieu d'toolbar.
 * `z-[60]` : reste visible et cliquable au-dessus des modales de module.
 * Avec une modale ouverte, un clic d'onglet remplace l'entrée d'historique
 * (bascule de module sans empiler — la fermeture reste un simple retour).
 */
export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const base = `/campaign/${campaignId}`;
  const router = useRouter();
  const tabs = [
    { href: `${base}/vtt`, label: "Table" },
    { href: `${base}/wiki`, label: "Wiki" },
    { href: `${base}/graph`, label: "Graphe" },
    { href: `${base}/journal`, label: "Journal" },
    { href: `${base}/choices`, label: "Choix" },
    { href: `${base}/ambiance`, label: "Ambiance" },
    { href: `${base}/combat`, label: "Combat" },
    { href: `${base}/fiches`, label: "Fiches" },
    { href: `${base}/macros`, label: "Macros" },
    { href: `${base}/settings`, label: "Réglages" },
    { href: `${base}/permissions`, label: "Permissions" },
  ] as const;
  const pathname = usePathname();

  if (pathname === base) return null;

  function tabClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Clic simple uniquement : new tab / ouverture native laissées au Link.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (!document.querySelector('[role="dialog"]:not(.hidden)')) return;
    e.preventDefault();
    router.replace(href);
  }

  return (
    <nav
      aria-label="Modules de la campagne"
      className="relative z-[60] h-11 shrink-0 border-b border-border bg-card/85 backdrop-blur"
    >
      <div className="bar no-scrollbar flex h-full items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              onClick={(e) => tabClick(e, tab.href)}
              className={
                active
                  ? "btn btn-primary shrink-0 px-3 py-1.5 text-xs"
                  : "btn shrink-0 border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
