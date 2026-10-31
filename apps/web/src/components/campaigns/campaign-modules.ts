/** Événement émis par le top-nav quand un module doit s'ouvrir dans une fenêtre. */
export const OPEN_MODULE_EVENT = "aetheris:open-module";

/** Modules d'une campagne : menu du top-nav, raccourcis 1–9. */
export const CAMPAIGN_MODULES = [
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

export type CampaignModule = (typeof CAMPAIGN_MODULES)[number];
