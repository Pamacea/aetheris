"use client";

import { useEffect } from "react";
import { CAMPAIGN_MODULES } from "./campaign-modules";

const MODULE_SLUGS = new Set<string>(CAMPAIGN_MODULES.map((mod) => mod.slug));

/**
 * Navigation client d'un module : dans une fenêtre-bureau (iframe), le
 * `embed=1` doit survivre au `router.push`, sinon le garde serveur renvoie
 * l'iframe vers la table. Hors mode embed, l'URL reste inchangée.
 */
export function withEmbed(href: string): string {
  if (typeof window === "undefined") return href;
  const embedded =
    window.self !== window.top || new URLSearchParams(window.location.search).get("embed") === "1";
  if (!embedded) return href;
  const url = new URL(href, window.location.origin);
  url.searchParams.set("embed", "1");
  return `${url.pathname}${url.search}`;
}

/** Dans une fenêtre-bureau (iframe same-origin), masque le chrome applicatif via globals.css. */
export function EmbedMode() {
  useEffect(() => {
    if (window.self === window.top) return;
    document.documentElement.dataset.embed = "";

    // Un lien interne d'un module reste dans l'iframe (`embed=1`) ou sort
    // vers la table — jamais de second bureau imbriqué.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target || anchor.origin !== location.origin) return;
      const [, route, id, slug] = anchor.pathname.split("/");
      if (route !== "campaign" || !id) return;
      if (slug === "vtt") {
        event.preventDefault();
        window.top?.location.assign(anchor.href);
        return;
      }
      if (!slug || !MODULE_SLUGS.has(slug)) return;
      event.preventDefault();
      const url = new URL(anchor.href);
      url.searchParams.set("embed", "1");
      window.location.assign(url.toString());
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
