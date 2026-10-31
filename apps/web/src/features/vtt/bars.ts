// Classe de conteneur commune aux barres VTT (copiée 4× → source unique).
export const VTT_BAR_CLS =
  "flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-card/60 px-3 py-2 text-xs";

/**
 * Panneau flottant des options d'outil (Grille, Murs, Brouillard) : posé
 * au-dessus de la carte au lieu d'une bande pleine largeur qui la rogne.
 */
export const VTT_PANEL_CLS =
  "pointer-events-auto flex max-w-[min(92%,34rem)] flex-wrap items-center gap-x-4 gap-y-2 border border-border bg-neutral-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md";
