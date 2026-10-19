"use client";

import { useEffect } from "react";

/**
 * Lien d'évitement (Phase 11 a11y) : premier foyer de la page, saute la
 * nav et place le focus sur le <main> de la page courante.
 * La cible #contenu est déclarée ici (et non dans chaque layout/page)
 * pour couvrir toutes les routes sans y éditer.
 */
export function SkipLink() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.id ||= "contenu";
    (main as HTMLElement).tabIndex = -1;
  }, []);

  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:border focus:border-accent focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:tracking-widest focus:text-foreground focus:uppercase"
      onClick={(e) => {
        const main = document.querySelector("main");
        if (!main) return;
        e.preventDefault();
        (main as HTMLElement).tabIndex = -1;
        main.focus();
        main.scrollIntoView();
      }}
    >
      Aller au contenu
    </a>
  );
}
