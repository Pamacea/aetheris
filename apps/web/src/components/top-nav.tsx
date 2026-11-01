"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CAMPAIGN_MODULES as MODULES, OPEN_MODULE_EVENT } from "./campaigns/campaign-modules";

const NAV_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/library", label: "Bibliothèque" },
  { href: "/novels", label: "Studio d'écriture" },
  { href: "/profile", label: "Profil" },
  { href: "/aide", label: "Aide" },
] as const;

/**
 * Milieu de la top bar : nav globale. Dans une campagne, les raccourcis 1–9
 * ouvrent les modules du dock (9 premiers).
 */
export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const campaignId = pathname.startsWith("/campaign/") ? pathname.split("/")[2] : null;

  // Sur la table, les modules s'ouvrent en fenêtres (bureau) : jamais de navigation.
  const onDesktop = campaignId !== null && pathname === `/campaign/${campaignId}/vtt`;

  // Raccourcis 1–9 : uniquement dans une campagne, jamais depuis un champ.
  useEffect(() => {
    if (!campaignId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // `code` = position physique : sur AZERTY la rangée produit & é " ' (
      // mais reste Digit1…Digit9.
      const match = /^Digit([1-9])$/.exec(e.code);
      if (!match) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const mod = MODULES[Number(match[1]) - 1];
      if (!mod) return;
      e.preventDefault();
      if (onDesktop) {
        if (mod.slug !== "vtt") {
          window.dispatchEvent(new CustomEvent(OPEN_MODULE_EVENT, { detail: mod.slug }));
        }
        return;
      }
      router.push(
        mod.slug === "vtt"
          ? `/campaign/${campaignId}/vtt`
          : `/campaign/${campaignId}/vtt?open=${mod.slug}`,
      );
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [campaignId, onDesktop, router]);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
      <nav
        aria-label="Navigation principale"
        className={`${campaignId ? "hidden md:flex" : "flex"} shrink-0 items-center gap-3`}
      >
        {NAV_LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center gap-3">
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
          </span>
        ))}
      </nav>
    </div>
  );
}
