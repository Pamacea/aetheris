import type { NoteBlock } from "@aetheris/shared";

export interface WikiNoteMeta {
  id: string;
  title: string;
  folder: string | null;
  /** templateId ou "note" (note libre / fiche orpheline). */
  type: string;
}

export interface WikiTemplateMeta {
  id: string;
  name: string;
  category: string | null;
  schema: unknown;
}

export interface WikiGraphData {
  nodes: { id: string; label: string }[];
  links: { source: string; target: string }[];
}

export interface WikiAppProps {
  campaignId: string;
  notes: WikiNoteMeta[];
  templates: WikiTemplateMeta[];
  active: {
    id: string;
    title: string;
    folder: string | null;
    contentHtml: string;
    type: string;
    data: Record<string, unknown>;
    /** Blocs structurés (data.blocks) déjà filtrés pour les joueurs. */
    blocks: NoteBlock[];
    template: WikiTemplateMeta | null;
  } | null;
  backlinks: { id: string; title: string }[];
  graph: WikiGraphData;
  isGM: boolean;
  /** Bibliothèque de blocs de campagne (déjà filtrée `gm` côté serveur). */
  blockLibrary: NoteBlock[];
}

export type WikiActiveNote = NonNullable<WikiAppProps["active"]>;
