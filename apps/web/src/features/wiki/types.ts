/** Props du wiki (liste d'entrées + entrée active) partagées client/serveur. */
export interface WikiEntryMeta {
  id: string;
  title: string;
  folder: string | null;
}

export interface WikiActiveEntry {
  id: string;
  title: string;
  folder: string | null;
  /** HTML sanitisé (gm-secrets déjà stripés pour un joueur). */
  contentHtml: string;
  /** Slug public, null = entrée non partagée. */
  shareSlug: string | null;
}

export interface WikiAppProps {
  campaignId: string;
  entries: WikiEntryMeta[];
  active: WikiActiveEntry | null;
  isGM: boolean;
}
