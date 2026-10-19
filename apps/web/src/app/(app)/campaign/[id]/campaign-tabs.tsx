"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Onglets du hub — l'état actif se déduit de l'URL (usePathname). */
export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const base = `/campaign/${campaignId}`;
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

  return (
    <nav aria-label="Modules de la campagne" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "btn btn-primary px-3 py-1.5 text-xs"
                : "btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
