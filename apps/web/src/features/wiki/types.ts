/** Props du wiki (liste d'entrées + entrée active) partagées client/serveur. */
export interface WikiEntryMeta {
  id: string;
  title: string;
  folder: string | null;
  /** templateId ou "note" (note libre / fiche orpheline). */
  type: string;
}

/** Modèle de fiche (JsonTemplate) tel que transmis au client. */
export interface WikiTemplateMeta {
  id: string;
  name: string;
  category: string | null;
  schema: unknown;
}

/** Alias historique (formulaire de fiche). */
export type WikiNoteMeta = WikiEntryMeta;

export interface WikiActiveEntry {
  id: string;
  title: string;
  folder: string | null;
  /** HTML sanitisé (gm-secrets déjà stripés pour un joueur). */
  contentHtml: string;
  /** Slug public, null = entrée non partagée. */
  shareSlug: string | null;
  /** templateId ou "note". */
  type: string;
  /** Valeurs de la fiche (Entity.data sans la clé `blocks`). */
  data: Record<string, unknown>;
  /** Modèle associé (null pour une note libre). */
  template: WikiTemplateMeta | null;
}

export interface WikiAppProps {
  campaignId: string;
  entries: WikiEntryMeta[];
  active: WikiActiveEntry | null;
  templates: WikiTemplateMeta[];
  /** Entrées qui référencent l'entrée active ([[liens]] + champs « tag »). */
  backlinks: { id: string; title: string }[];
  isGM: boolean;
}
