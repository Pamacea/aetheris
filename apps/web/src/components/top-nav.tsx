"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Campagnes" },
  { href: "/novels", label: "Romans" },
  { href: "/profile", label: "Profil" },
] as const;

const MODULES = [
  { slug: "vtt", label: "Table" },
  { slug: "wiki", label: "Wiki" },
  { slug: "graph", label: "Graphe" },
  { slug: "journal", label: "Journal" },
  { slug: "choices", label: "Choix" },
  { slug: "ambiance", label: "Ambiance" },
  { slug: "combat", label: "Combat" },
  { slug: "fiches", label: "Fiches" },
  { slug: "macros", label: "Macros" },
  { slug: "settings", label: "Réglages" },
  { slug: "permissions", label: "Permissions" },
] as const;

/**
 * Milieu de la top bar : nav globale + (uniquement dans une campagne)
 * les 11 modules — une seule barre remplace barre d'onglets + modales.
 * `overflow-x-auto` : ~14 entrées dépassent souvent la largeur de `.bar`,
 * on scrolle horizontalement plutôt que de wrap (hauteur = 3.75rem figée).
 */
export function TopNav() {
  const pathname = usePathname();
  const campaignId = pathname.startsWith("/campaign/") ? pathname.split("/")[2] : null;

  return (
    <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      <nav aria-label="Navigation principale" className="flex shrink-0 items-center gap-3">
        {NAV_LINKS.map((link, i) => (
          <Fragment key={link.href}>
            <Link
              href={link.href}
              className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              {link.label}
            </Link>
            {i === 0 && (
              <span aria-hidden className="mx-1.5 select-none text-sm text-accent/70">
                ❦
              </span>
            )}
          </Fragment>
        ))}
      </nav>

      {campaignId && (
        <>
          <span aria-hidden className="mx-2 h-4 w-px shrink-0 bg-border" />
          <nav aria-label="Modules de la campagne" className="flex shrink-0 items-center gap-1">
            {MODULES.map((mod) => {
              const href = `/campaign/${campaignId}/${mod.slug}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={mod.slug}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "btn btn-primary shrink-0 px-3 py-1.5 text-xs"
                      : "btn shrink-0 border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
                  }
                >
                  {mod.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
