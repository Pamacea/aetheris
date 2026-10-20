"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";

/**
 * Glisser à la souris : le défilement tactile natif ne couvre pas les
 * desktops — presser puis faire glisser fait rouler le rail (pointer capture).
 */
function dragScroll(el: HTMLElement, e: React.PointerEvent) {
  if (e.pointerType !== "mouse") return;
  e.preventDefault(); // pas de sélection de texte ni de fantôme de drag natif
  const startX = e.clientX;
  const startLeft = el.scrollLeft;
  const onMove = (ev: PointerEvent) => {
    el.scrollLeft = startLeft - (ev.clientX - startX);
  };
  const stop = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  // Le rail déborde-t-il vraiment ? Le lavis de continuation ne s'affiche
  // qu'alors (sinon il flotterait devant « Se déconnecter » sur grand écran).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setClipped(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pathname]);

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <div
        ref={scrollerRef}
        onPointerDown={(e) => dragScroll(e.currentTarget, e)}
        className={`no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto select-none ${
          clipped ? "justify-start" : "justify-center"
        }`}
      >
        <nav
          aria-label="Navigation principale"
          className={`${campaignId ? "hidden md:flex" : "flex"} shrink-0 items-center gap-3`}
        >
          {NAV_LINKS.map((link, i) => (
            <Fragment key={link.href}>
              <Link
                href={link.href}
                className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                {link.label}
              </Link>
              {i === 0 && (
                <span
                  aria-hidden
                  className="mx-1.5 hidden select-none text-sm text-accent/70 md:inline"
                >
                  ❦
                </span>
              )}
            </Fragment>
          ))}
        </nav>

        {campaignId && (
          <>
            <span aria-hidden className="mx-2 hidden h-4 w-px shrink-0 bg-border md:block" />
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
      {/* Débordement : le lavis signale qu'on peut glisser (drag ou tactile). */}
      {clipped && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-card to-transparent"
        />
      )}
    </div>
  );
}
